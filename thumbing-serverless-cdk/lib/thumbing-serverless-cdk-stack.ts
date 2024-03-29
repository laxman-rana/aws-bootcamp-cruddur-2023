import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';

// Loading env variables
dotenv.config();


export class ThumbingServerlessCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const uploadsBucketName: string = process.env.UPLOADS_BUCKET_NAME as string;
    const assetsBucketName: string = process.env.ASSETS_BUCKET_NAME || '';
    const folderInput: string = process.env.THUMBING_S3_FOLDER_INPUT || '';
    const folderOutput: string = process.env.THUMBING_S3_FOLDER_OUTPUT || '';
    const webhookUrl: string = process.env.THUMBING_WEBHOOK_URL || '';
    const topicName: string = process.env.THUMBING_TOPIC_NAME || '';
    const functionPath: string = process.env.THUMBING_FUNCTION_PATH || '';

    console.log('uploadsBucketName',uploadsBucketName)
    console.log('assetsBucketName',assetsBucketName)
    console.log('folderOutput',folderOutput)
    console.log('webhookUrl',webhookUrl)
    console.log('topicName',topicName)
    console.log('functionPath',functionPath)

    const uploadsBucket = this.createBucket(uploadsBucketName, 'UploadsBucket');
    const assetsBucket = this.createBucket(assetsBucketName, 'AssetsBucket');
    
    const lambdaa = this.createLambda(folderInput, folderOutput, functionPath, assetsBucketName);

    const snsTopic = this.createSnsTopic(topicName)
    this.createSnsSubscription(snsTopic, webhookUrl)

     // S3 Event Notifications
     this.createS3NotifyToLambda(folderInput, lambdaa, uploadsBucket)
     this.createS3NotifyToSns(folderOutput,snsTopic, assetsBucket)
     
    const s3UploadsReadWritePolicy = this.createPolicyBucketAccess(uploadsBucket.bucketArn)
    const s3AssetsReadWritePolicy = this.createPolicyBucketAccess(assetsBucket.bucketArn)

     // attach policies for permissions
     lambdaa.addToRolePolicy(s3UploadsReadWritePolicy);
     lambdaa.addToRolePolicy(s3AssetsReadWritePolicy);

   
    //const snsPublishPolicy = this.createPolicySnSPublish(snsTopic.topicArn)

  }

  createBucket = (bucketName: string,  name: string):s3.IBucket => {
    const bucket  = new s3.Bucket(this, name, {
      bucketName: bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    return bucket;
  }

  importBucket(bucketName: string, name: string): s3.IBucket {
    const bucket = s3.Bucket.fromBucketName(this, name,bucketName);
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
      destination//,
     // {prefix: prefix}
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

  createSnsTopic(topicName: string): sns.ITopic{
    const logicalName = "ThumbingTopic";
    const snsTopic = new sns.Topic(this, logicalName, {
      topicName: topicName
    });
    return snsTopic;
  }

  createSnsSubscription(snsTopic: sns.ITopic, webhookUrl: string): sns.Subscription {
    const snsSubscription = snsTopic.addSubscription(
      new subscriptions.UrlSubscription(webhookUrl)
    )
    return snsSubscription;
  }

  // createPolicySnSPublish(topicArn: string){
  //   const snsPublishPolicy = new iam.PolicyStatement({
  //     actions: [
  //       'sns:Publish',
  //     ],
  //     resources: [
  //       topicArn
  //     ]
  //   });
  //   return snsPublishPolicy;
  // }
  
  createS3NotifyToSns(prefix: string, snsTopic: sns.ITopic, bucket: s3.IBucket): void {
    const destination = new s3n.SnsDestination(snsTopic)
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT, 
      destination,
      {prefix: prefix}
    );
  }

}
