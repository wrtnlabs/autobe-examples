import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardNotificationDeliveryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationDeliveryLog";
export async function test_api_notification_delivery_permanent_failure(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a context for this API call
  const actorConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate all required random data
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  const recipientId = typia.random<string & tags.Format<"uuid">>();
  const logId = typia.random<string & tags.Format<"uuid">>();
  const deliveryChannel: "email" | "push" | "in_app" | "sms" | "webhook" =
    RandomGenerator.pick([
      "email",
      "push",
      "in_app",
      "sms",
      "webhook",
    ] as const);
  // Step 3: Create a delivery log entry in 'pending' state
  const initialLog =
    await api.functional.discussionBoard.notifications.delivery_logs.update(
      actorConnection,
      {
        logId,
        body: {
          status: "pending",
          recipient_id: recipientId,
          notification_type: notificationId,
          delivery_channel: deliveryChannel,
        } satisfies IDiscussionBoardNotificationDeliveryLog.IUpdate,
      },
    );
  typia.assert(initialLog);
  // Validate initial status is correct and check for required response properties
  TestValidator.equals(
    "initial status should be pending",
    initialLog.status,
    "pending",
  );
  // Note: recipient_id is in the request but not in the response
  // Response has notification_id, not recipient_id
  TestValidator.equals(
    "initial notification_id should match",
    initialLog.notification_id,
    notificationId,
  );
  // Created_at should be present and formatted correctly
  TestValidator.predicate("created_at is ISO 8601 date-time", () => {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    return isoRegex.test(initialLog.created_at);
  });
  // Step 4: Update the delivery log to 'failed' status
  const updatedLog =
    await api.functional.discussionBoard.notifications.delivery_logs.update(
      actorConnection,
      {
        logId: initialLog.id,
        body: {
          status: "failed",
          recipient_id: recipientId,
          notification_type: notificationId,
          delivery_channel: deliveryChannel,
        } satisfies IDiscussionBoardNotificationDeliveryLog.IUpdate,
      },
    );
  typia.assert(updatedLog);
  // Validate update results
  TestValidator.equals(
    "final status should be failed",
    updatedLog.status,
    "failed",
  );
  // Note: error_message should be populated automatically by the system when status is 'failed'
  TestValidator.predicate(
    "error message should be recorded (non-empty)",
    () => {
      return (
        updatedLog.error_message !== undefined &&
        updatedLog.error_message !== ""
      );
    },
  );
  // Validate notification_id still matches
  TestValidator.equals(
    "final notification_id should match",
    updatedLog.notification_id,
    notificationId,
  );
  // Updated_at should be present and formatted correctly
  TestValidator.predicate("updated_at is ISO 8601 date-time", () => {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    return isoRegex.test(updatedLog.updated_at);
  });
  TestValidator.predicate("updated_at is after created_at", () => {
    return new Date(updatedLog.updated_at) > new Date(initialLog.created_at);
  });
  // Step 5: Validate that 'failed' status prevents transition to 'permanent_failure'
  // Try to update from 'failed' to 'permanent_failure' - this should fail
  await TestValidator.error(
    "attempting update from failed to permanent_failure should fail",
    async () => {
      await api.functional.discussionBoard.notifications.delivery_logs.update(
        actorConnection,
        {
          logId: updatedLog.id,
          body: {
            status: "permanent_failure",
            recipient_id: recipientId,
            notification_type: notificationId,
            delivery_channel: deliveryChannel,
          } satisfies IDiscussionBoardNotificationDeliveryLog.IUpdate,
        },
      );
    },
  );
  // Step 6: Verify that error message indicates permanent delivery failure
  // The system should have logged a permanent failure reason
  TestValidator.predicate(
    "error message should indicate permanent failure",
    () => {
      return (
        updatedLog.error_message !== undefined &&
        (updatedLog.error_message.includes("invalid") ||
          updatedLog.error_message.includes("failed") ||
          updatedLog.error_message.includes("unreachable"))
      );
    },
  );
}
