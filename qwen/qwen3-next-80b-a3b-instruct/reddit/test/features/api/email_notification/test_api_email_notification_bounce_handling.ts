import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformEmailNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEmailNotificationQueue";
export async function test_api_email_notification_bounce_handling(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique queue_id for this test (representing an existing notification)
  const queueId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Generate a unique recipient email
  const recipientEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // Generate unique subject and content for the notification (for reference, not sent in update)
  const subject: string & tags.MaxLength<255> = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const content: string & tags.MaxLength<65535> = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });
  // Generate a delivery timestamp for the initial successful delivery
  const deliveryTimestamp: string & tags.Format<"date-time"> =
    new Date().toISOString();
  // First update: Set notification status to 'sent' to simulate successful delivery
  // This simulates the creation of a notification that was successfully delivered
  const initialUpdate: ICommunityPlatformEmailNotificationQueue =
    await api.functional.communityPlatform.email_notification_queue.update(
      connection,
      {
        queueId: queueId,
        body: {
          status: "sent",
          delivery_timestamp: deliveryTimestamp,
          delivery_attempts: 1,
        } satisfies ICommunityPlatformEmailNotificationQueue.IUpdate,
      },
    );
  typia.assert(initialUpdate);
  // Validate the initial update set the notification to 'sent' with correct data
  TestValidator.equals(
    "initial notification status should be 'sent'",
    initialUpdate.status,
    "sent",
  );
  TestValidator.equals(
    "initial delivery attempts should be 1",
    initialUpdate.delivery_attempts,
    1,
  );
  TestValidator.equals(
    "initial delivery timestamp should match",
    initialUpdate.delivery_timestamp,
    deliveryTimestamp,
  );
  // Note: We cannot validate recipient_email, subject, or content as they are immutable and not part of IUpdate
  // Simulate bounce handling: update the notification status from 'sent' to 'failed'
  const bounceErrorMessage: string & tags.MaxLength<1000> = "550 User unknown";
  const updatedNotification: ICommunityPlatformEmailNotificationQueue =
    await api.functional.communityPlatform.email_notification_queue.update(
      connection,
      {
        queueId: queueId,
        body: {
          status: "failed",
          error_message: bounceErrorMessage,
          delivery_attempts: 2,
          delivery_timestamp: deliveryTimestamp, // Should remain unchanged
        } satisfies ICommunityPlatformEmailNotificationQueue.IUpdate,
      },
    );
  typia.assert(updatedNotification);
  // Validate that the bounce handling update was successful
  TestValidator.equals(
    "notification status should be updated to 'failed'",
    updatedNotification.status,
    "failed",
  );
  // Use typia.assert to ensure error_message is included in the response type
  const updatedWithErrorMessage = typia.assert<ICommunityPlatformEmailNotificationQueue & { error_message: string & tags.MaxLength<1000> }>(updatedNotification);
  TestValidator.equals(
    "bounce error message should be preserved",
    updatedWithErrorMessage.error_message,
    bounceErrorMessage,
  );
  TestValidator.equals(
    "delivery attempts should be incremented to 2",
    updatedWithErrorMessage.delivery_attempts,
    2,
  );
  TestValidator.equals(
    "delivery timestamp should remain unchanged from initial delivery",
    updatedWithErrorMessage.delivery_timestamp,
    deliveryTimestamp,
  );
  // Test that attempting another update with same status and attempts is allowed
  // This verifies the system allows updates to notifications that are already failed
  const finalUpdate: ICommunityPlatformEmailNotificationQueue =
    await api.functional.communityPlatform.email_notification_queue.update(
      connection,
      {
        queueId: queueId,
        body: {
          status: "failed", // Same status - should be allowed
          delivery_attempts: 2, // Same attempts count - should be allowed
        } satisfies ICommunityPlatformEmailNotificationQueue.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  // Confirm the state remains unchanged after final update
  TestValidator.equals(
    "final notification status should still be 'failed'",
    finalUpdate.status,
    "failed",
  );
  TestValidator.equals(
    "final delivery attempts should still be 2",
    finalUpdate.delivery_attempts,
    2,
  );
  // Use typia.assert to ensure error_message is included in the response type
  const finalWithErrorMessage = typia.assert<ICommunityPlatformEmailNotificationQueue & { error_message: string & tags.MaxLength<1000> }>(finalUpdate);
  TestValidator.equals(
    "final error message should still be same",
    finalWithErrorMessage.error_message,
    bounceErrorMessage,
  );
}