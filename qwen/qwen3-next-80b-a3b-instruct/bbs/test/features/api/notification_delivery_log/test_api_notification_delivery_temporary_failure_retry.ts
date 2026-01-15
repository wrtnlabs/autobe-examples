import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardNotificationDeliveryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationDeliveryLog";
export async function test_api_notification_delivery_temporary_failure_retry(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for system component
  const systemConnection: api.IConnection = { host: connection.host };
  // Use a random UUID as the log ID (the entry is assumed to already exist with status 'pending')
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Random values for required fields in IUpdate
  const recipientId = typia.random<string & tags.Format<"uuid">>();
  const notificationType = "user_notification";
  const deliveryChannel: "email" | "push" | "in_app" | "sms" | "webhook" =
    "push";
  // First update: mark as failed (temporary failure)
  const failedResponse =
    await api.functional.discussionBoard.notifications.delivery_logs.update(
      systemConnection,
      {
        logId,
        body: {
          status: "failed",
          recipient_id: recipientId,
          notification_type: notificationType,
          delivery_channel: deliveryChannel,
        } satisfies IDiscussionBoardNotificationDeliveryLog.IUpdate,
      },
    );
  typia.assert(failedResponse);
  TestValidator.equals(
    "status should be failed after temporary failure",
    failedResponse.status,
    "failed",
  );
  TestValidator.predicate(
    "error message should indicate network timeout",
    () => {
      return (
        failedResponse.error_message !== undefined &&
        failedResponse.error_message !== null &&
        failedResponse.error_message.includes("timeout")
      );
    },
  );
  // Second update: retry (transition back to pending)
  const retryResponse =
    await api.functional.discussionBoard.notifications.delivery_logs.update(
      systemConnection,
      {
        logId,
        body: {
          status: "pending",
          recipient_id: recipientId, // same values as before
          notification_type: notificationType,
          delivery_channel: deliveryChannel,
        } satisfies IDiscussionBoardNotificationDeliveryLog.IUpdate,
      },
    );
  typia.assert(retryResponse);
  TestValidator.equals(
    "status should be pending after retry",
    retryResponse.status,
    "pending",
  );
  TestValidator.equals(
    "error message should be cleared after retry",
    retryResponse.error_message,
    null,
  );
  TestValidator.notEquals(
    "updated_at should advance after retry",
    retryResponse.updated_at,
    failedResponse.updated_at,
  );
}
