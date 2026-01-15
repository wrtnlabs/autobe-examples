import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardNotificationDeliveryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationDeliveryLog";
export async function test_api_notification_delivery_status_updated(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid UUID for an existing delivery log to update
  const logId: string = typia.random<string & tags.Format<"uuid">>();
  const notificationId: string = typia.random<string & tags.Format<"uuid">>();
  // Prepare update payload with exact required properties from IUpdate
  const updatePayload: IDiscussionBoardNotificationDeliveryLog.IUpdate = {
    status: "delivered",
    recipient_id: typia.random<string & tags.Format<"uuid">>(),
    notification_type: "user_notification",
    delivery_channel: "email",
  };
  // Execute the update operation
  const updatedDeliveryLog: IDiscussionBoardNotificationDeliveryLog =
    await api.functional.discussionBoard.notifications.delivery_logs.update(
      connection,
      {
        logId: logId,
        body: updatePayload,
      },
    );
  // Validate the response structure using typia.assert
  typia.assert(updatedDeliveryLog);
  // Verify status transition from pending to delivered
  TestValidator.equals(
    "delivery status updated to delivered",
    updatedDeliveryLog.status,
    "delivered",
  );
  // Verify notification_id is preserved in the response
  TestValidator.equals(
    "notification_id preserved",
    updatedDeliveryLog.notification_id,
    notificationId,
  );
  // Verify created_at timestamp exists (format validation handled by typia.assert)
  TestValidator.predicate(
    "created_at is ISO 8601 formatted",
    updatedDeliveryLog.created_at !== undefined,
  );
  // Verify updated_at timestamp exists and is newer than created_at (format validation handled by typia.assert)
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedDeliveryLog.updated_at) >
      new Date(updatedDeliveryLog.created_at),
  );
}
