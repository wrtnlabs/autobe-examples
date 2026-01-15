import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardNotificationDeliveryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationDeliveryLog";
export async function test_api_notification_delivery_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a realistic notification delivery log using typia.random
  const deliveryLog: IDiscussionBoardNotificationDeliveryLog =
    typia.random<IDiscussionBoardNotificationDeliveryLog>();
  typia.assert(deliveryLog);
  // Retrieve the delivery log entry using its unique id as logId
  const retrievedLog: IDiscussionBoardNotificationDeliveryLog =
    await api.functional.discussionBoard.notifications.delivery_logs.at(
      connection,
      {
        logId: deliveryLog.id,
      },
    );
  typia.assert(retrievedLog);
  // Validate all fields present in the IDiscussionBoardNotificationDeliveryLog schema
  TestValidator.equals(
    "retrieved delivery log ID matches generated ID",
    retrievedLog.id,
    deliveryLog.id,
  );
  TestValidator.equals(
    "retrieved notification ID matches generated notification ID",
    retrievedLog.notification_id,
    deliveryLog.notification_id,
  );
  TestValidator.equals(
    "retrieved status matches generated status",
    retrievedLog.status,
    deliveryLog.status,
  );
  TestValidator.equals(
    "retrieved delivery method matches generated delivery method",
    retrievedLog.delivery_method,
    deliveryLog.delivery_method,
  );
  TestValidator.equals(
    "retrieved error message matches generated error message",
    retrievedLog.error_message,
    deliveryLog.error_message,
  );
  TestValidator.equals(
    "retrieved created_at matches generated created_at",
    retrievedLog.created_at,
    deliveryLog.created_at,
  );
  TestValidator.equals(
    "retrieved updated_at matches generated updated_at",
    retrievedLog.updated_at,
    deliveryLog.updated_at,
  );
}
