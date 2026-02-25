import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_log_search_date_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register administrator account using SDK directly since utility function requires specific auth pattern
  const admin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Update adminConnection with authentication token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: admin.token.access,
  };
  // Test 1: Search logs after a specific date (created_at_from)
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
  const logsAfter =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          created_at_from: dateFrom,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(logsAfter);
  // Validate that all returned logs were created after the specified date
  for (const log of logsAfter.data) {
    TestValidator.predicate(
      "log created after specified date",
      new Date(log.performed_at) >= new Date(dateFrom),
    );
  }
  // Test 2: Search logs before a specific date (performed_at_to)
  const dateTo = new Date().toISOString(); // Current time
  const logsBefore =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          performed_at_to: dateTo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(logsBefore);
  // Test 3: Search logs within a date range (both from and to)
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const endDate = new Date().toISOString(); // Current time
  const logsInRange =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          performed_at_from: startDate,
          performed_at_to: endDate,
          created_at_from: startDate,
          created_at_to: endDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(logsInRange);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    logsInRange.pagination.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit",
    logsInRange.pagination.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count",
    logsInRange.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    logsInRange.pagination.pagination.pages >= 0,
  );
  // Test 4: Search with overlapping date ranges
  const overlappingStart = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 14 days ago
  const overlappingEnd = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const overlappingLogs =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          performed_at_from: overlappingStart,
          performed_at_to: overlappingEnd,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(overlappingLogs);
  // Test 5: Search with invalid date combination (from after to) - should handle gracefully
  const invalidFrom = new Date().toISOString(); // Future date
  const invalidTo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Past date
  const invalidDateLogs =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          performed_at_from: invalidFrom,
          performed_at_to: invalidTo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(invalidDateLogs);
  // Test 6: Search with only pagination parameters (no date filters)
  const allLogs =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(allLogs);
  // Verify that paginated results maintain chronological order
  for (let i = 1; i < allLogs.data.length; i++) {
    const currentDate = new Date(allLogs.data[i].performed_at);
    const previousDate = new Date(allLogs.data[i - 1].performed_at);
    TestValidator.predicate(
      "logs ordered chronologically",
      currentDate >= previousDate,
    );
  }
}
