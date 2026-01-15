import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardNotificationDeliveryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationDeliveryLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotificationDeliveryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationDeliveryLog";
export async function test_api_notification_delivery_logs_filter_by_status_and_method(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for admin access
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate random test data for delivery logs
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  // Create multiple delivery log entries with different status and delivery_method combinations
  const deliveryLogs = ArrayUtil.repeat(10, (index) => {
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      notification_id: notificationId,
      status: RandomGenerator.pick([
        "pending",
        "failed",
        "delivered",
      ] as const),
      delivery_method: RandomGenerator.pick([
        "email",
        "push",
        "sms",
        "in_app",
      ] as const),
      created_at: new Date(Date.now() - index * 1000 * 60).toISOString(), // Descending order by creation time
      updated_at: new Date(Date.now() - index * 1000 * 60).toISOString(),
    } satisfies IDiscussionBoardNotificationDeliveryLog;
  });
  // Sort logs in descending order by createdAt for validation
  const expectedSortedLogs = [...deliveryLogs].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  // Find logs with specific status and delivery_method for filtering test
  const targetStatus: "failed" | "success" = RandomGenerator.pick([
    "failed",
    "success",
  ] as const);
  const targetMethod: "email" | "push" = RandomGenerator.pick([
    "email",
    "push",
  ] as const);
  // Filter expected results based on status and delivery_method
  const expectedFilteredLogs = expectedSortedLogs.filter(
    (log) =>
      log.status === targetStatus && log.delivery_method === targetMethod,
  );
  // Create pagination parameters
  const page = 1;
  const limit = 10;
  // Perform the filter operation with status and delivery_method parameters
  const result =
    await api.functional.discussionBoard.notifications.delivery_logs.index(
      adminConnection,
      {
        body: {
          status: targetStatus,
          deliveryMethod: targetMethod,
          page,
          limit,
        } satisfies IDiscussionBoardNotificationDeliveryLog.IRequest,
      },
    );
  // Validate the response structure
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("page number matches", result.pagination.current, page);
  TestValidator.equals("limit matches", result.pagination.limit, limit);
  TestValidator.predicate(
    "total records greater than or equal to expected",
    result.pagination.records >= expectedFilteredLogs.length,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    result.pagination.pages >= Math.ceil(expectedFilteredLogs.length / limit),
  );
  // Validate data array structure
  TestValidator.equals(
    "data array length matches expected",
    result.data.length,
    expectedFilteredLogs.length,
  );
  // Validate each log entry in the response
  for (let i = 0; i < result.data.length; i++) {
    const actualLog = result.data[i];
    const expectedLog = expectedFilteredLogs[i];
    // Validate basic structure and values
    TestValidator.equals("log id matches", actualLog.id, expectedLog.id);
    TestValidator.equals(
      "notification_id matches",
      actualLog.notification_id,
      expectedLog.notification_id,
    );
    TestValidator.equals(
      "status matches",
      actualLog.status,
      expectedLog.status,
    );
    TestValidator.equals(
      "delivery_method matches",
      actualLog.delivery_method,
      expectedLog.delivery_method,
    );
    TestValidator.equals(
      "created_at matches",
      actualLog.created_at,
      expectedLog.created_at,
    );
    TestValidator.equals(
      "updated_at matches",
      actualLog.updated_at,
      expectedLog.updated_at,
    );
    // Validate timestamp ordering (descending)
    if (i > 0) {
      const prevLog = result.data[i - 1];
      TestValidator.predicate(
        "logs are ordered by created_at descending",
        new Date(prevLog.created_at).getTime() >=
          new Date(actualLog.created_at).getTime(),
      );
    }
  }
  // Test empty results case
  const nonExistentStatus: "pending" | "failed" =
    targetStatus === "failed" ? "pending" : "failed";
  const nonExistentMethod: "email" | "push" =
    targetMethod === "email" ? "push" : "email";
  const emptyResult =
    await api.functional.discussionBoard.notifications.delivery_logs.index(
      adminConnection,
      {
        body: {
          status: nonExistentStatus,
          deliveryMethod: nonExistentMethod,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardNotificationDeliveryLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result count", emptyResult.data.length, 0);
  TestValidator.equals("empty pagination", emptyResult.pagination.records, 0);
  TestValidator.equals("empty pages", emptyResult.pagination.pages, 0);
}