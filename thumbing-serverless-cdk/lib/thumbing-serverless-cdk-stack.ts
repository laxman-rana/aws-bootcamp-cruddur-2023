import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';

// Loading env variables
dotenv.config();


export class ThumbingServerlessCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const bucketName: string = process.env.THUMBING_BUCKET_NAME || '';
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
    const lambda = this.createLambda(folderInput, bucketName, folderInput, folderOutput);
  }

  createBucket = (bucketName: string):s3.IBucket => {
    const bucket  = new s3.Bucket(this, "ThumpingBucket", {
      bucketName: bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    return bucket;
  }

  createLambda = (functionPath: string, bucketName: string, folderIntput: string, folderOutput: string):lambda.IFunction => {
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
}
