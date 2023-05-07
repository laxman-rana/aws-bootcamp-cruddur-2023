import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';

// Loading env variables
dotenv.config();


export class ThumbingServerlessCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const bucketName: string = process.env.ASSETS_BUCKET_NAME || '';
    const folderInput: string = process.env.THUMBING_S3_FOLDER_INPUT || '';
    const folderOutput: string = process.env.THUMBING_S3_FOLDER_OUTPUT || '';
    const webhookUrl: string = process.env.THUMBING_WEBHOOK_URL || '';
    const topicName: string = process.env.THUMBING_TOPIC_NAME || '';
    const functionPath: string = process.env.THUMBING_FUNCTION_PATH || '';
    console.log('bucketName',bucketName)
    console.log('folderInput',folderInput)
    console.log('folderOutput',folderOutput)
    console.log('webhookUrl',webhookUrl)
    console.log('topicName',topicName)
    console.log('functionPath',functionPath)

    const bucket = this.createBucket(bucketName);
    const lambdaa = this.createLambda(folderInput, folderOutput, functionPath, bucketName);
    this.createS3NotifyToLambda(folderInput, lambdaa, bucket)

    const s3ReadWritePolicy = this.createPolicyBucketAccess(bucket.bucketArn);
    lambdaa.addToRolePolicy(s3ReadWritePolicy);
  }

  createBucket = (bucketName: string):s3.IBucket => {
    const bucket  = new s3.Bucket(this, "ThumpingBucket", {
      bucketName: bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    return bucket;
  }

  createLambda = (folderIntput: string, folderOutput: string, functionPath: string, bucketName: string): lambda.IFunction  => {
    const code = lambda.Code.fromAsset(functionPath)
    const lambdaFunction = new lambda.Function(this, 'ThumbLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code,
      environment: {
        DEST_BUCKET_NAME: bucketName,
        FOLDER_INPUT: folderIntput,
        FOLDER_OUTPUT: folderOutput,
        PROCESS_WIDTH: '512',
        PROCESS_HEIGHT: '512'
      }

    });
    return lambdaFunction;
  }

  createS3NotifyToLambda(prefix: string, lambda: lambda.IFunction, bucket: s3.IBucket): void {
    const destination = new s3n.LambdaDestination(lambda);
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED_PUT,
      destination,
      {prefix: prefix}
    )
  }

  createPolicyBucketAccess(bucketArn: string){
    const s3ReadWritePolicy = new iam.PolicyStatement({
      actions: [
        's3:GetObject',
        's3:PutObject',
      ],
      resources: [
        `${bucketArn}/*`,
      ]
    });
    return s3ReadWritePolicy;
  }
}
