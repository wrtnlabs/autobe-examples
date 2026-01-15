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
export async function test_api_notification_delivery_logs_pagination_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Test valid pagination parameters
  const paginationResponse: IPageIDiscussionBoardNotificationDeliveryLog =
    await api.functional.discussionBoard.notifications.delivery_logs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardNotificationDeliveryLog.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination current page",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    paginationResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    Math.ceil(
      paginationResponse.pagination.records /
        paginationResponse.pagination.limit,
    ) === paginationResponse.pagination.pages,
  );
  // Test date range filtering with valid ISO 8601 timestamps
  const dateRangeResponse: IPageIDiscussionBoardNotificationDeliveryLog =
    await api.functional.discussionBoard.notifications.delivery_logs.index(
      connection,
      {
        body: {
          createdAtFrom: new Date().toISOString(),
          createdAtTo: new Date(Date.now() + 86400000).toISOString(),
        } satisfies IDiscussionBoardNotificationDeliveryLog.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Test combined pagination and date range
  const combinedResponse: IPageIDiscussionBoardNotificationDeliveryLog =
    await api.functional.discussionBoard.notifications.delivery_logs.index(
      connection,
      {
        body: {
          page: 5,
          limit: 25,
          createdAtFrom: new Date(Date.now() - 604800000).toISOString(),
          createdAtTo: new Date().toISOString(),
        } satisfies IDiscussionBoardNotificationDeliveryLog.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.equals("combined page", combinedResponse.pagination.current, 5);
  TestValidator.equals("combined limit", combinedResponse.pagination.limit, 25);
  // Test edge case: exact same date for from/to
  const sameDayResponse: IPageIDiscussionBoardNotificationDeliveryLog =
    await api.functional.discussionBoard.notifications.delivery_logs.index(
      connection,
      {
        body: {
          createdAtFrom: new Date().toISOString(),
          createdAtTo: new Date().toISOString(),
        } satisfies IDiscussionBoardNotificationDeliveryLog.IRequest,
      },
    );
  typia.assert(sameDayResponse);
  // Test limit at maximum (100)
  const maxLimitResponse: IPageIDiscussionBoardNotificationDeliveryLog =
    await api.functional.discussionBoard.notifications.delivery_logs.index(
      connection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardNotificationDeliveryLog.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  // Test page at maximum (1000)
  const maxPageResponse: IPageIDiscussionBoardNotificationDeliveryLog =
    await api.functional.discussionBoard.notifications.delivery_logs.index(
      connection,
      {
        body: {
          page: 1000,
        } satisfies IDiscussionBoardNotificationDeliveryLog.IRequest,
      },
    );
  typia.assert(maxPageResponse);
}
