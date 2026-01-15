import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_logs_sorting_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user using the provided utility function
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid admin join data
  const adminJoinData: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  };
  // Authenticate admin using the provided utility function
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: adminJoinData });
  typia.assert(adminAuth);
  // Step 2: Create a new connection for API calls using the authenticated session
  const apiConnection: api.IConnection = { host: connection.host };
  // Set authorization header from the auth result
  if (adminAuth.token && adminAuth.token.access) {
    apiConnection.headers = {
      Authorization: `Bearer ${adminAuth.token.access}`,
    };
  }
  // Test 1: Fetch logs with basic request (default sorting by timestamp descending)
  const defaultResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      apiConnection,
      { body: {} satisfies ICommunityPlatformModerationLog.IRequest },
    );
  typia.assert(defaultResponse);
  // Validate we have at least one log to test with
  TestValidator.predicate(
    "at least one moderation log exists for testing",
    defaultResponse.data.length > 0,
  );
  // Test 2: Sort by moderator_name ascending
  const moderatorSortResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      apiConnection,
      {
        body: {
          sort_by: "moderator_name",
          sort_order: "asc",
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(moderatorSortResponse);
  // Validate we have results
  TestValidator.predicate(
    "moderator_name sort returns data",
    moderatorSortResponse.data.length > 0,
  );
  // Test 3: Sort by action_type descending
  const actionSortResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      apiConnection,
      {
        body: {
          sort_by: "action_type",
          sort_order: "desc",
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(actionSortResponse);
  TestValidator.predicate(
    "action_type sort returns data",
    actionSortResponse.data.length > 0,
  );
  // Test 4: Sort by target_type ascending
  const targetTypeSortResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      apiConnection,
      {
        body: {
          sort_by: "target_type",
          sort_order: "asc",
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(targetTypeSortResponse);
  TestValidator.predicate(
    "target_type sort returns data",
    targetTypeSortResponse.data.length > 0,
  );
  // Test 5: Sort by target_id descending
  const targetIdSortResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      apiConnection,
      {
        body: {
          sort_by: "target_id",
          sort_order: "desc",
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(targetIdSortResponse);
  TestValidator.predicate(
    "target_id sort returns data",
    targetIdSortResponse.data.length > 0,
  );
  // Test 6: Filter by moderator_id exact match
  // Use the first log's moderator_id from default response
  const moderatorIdFilter = defaultResponse.data[0].moderator_id;
  const moderatorFilterResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      apiConnection,
      {
        body: {
          moderator_id: moderatorIdFilter,
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(moderatorFilterResponse);
  TestValidator.predicate(
    "filter by moderator_id returns data",
    moderatorFilterResponse.data.length > 0,
  );
  TestValidator.equals(
    "filter by moderator_id matches",
    moderatorFilterResponse.data[0].moderator_id,
    moderatorIdFilter,
  );
  // Test 7: Filter by action_type exact match
  const actionTarget: ICommunityPlatformModerationLog.ISummary["action"] =
    defaultResponse.data[0].action;
  const actionFilterResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      apiConnection,
      {
        body: {
          action_type: actionTarget,
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(actionFilterResponse);
  TestValidator.predicate(
    "filter by action_type returns data",
    actionFilterResponse.data.length > 0,
  );
  TestValidator.predicate(
    "filter by action_type matches all entries",
    actionFilterResponse.data.every((log) => log.action === actionTarget),
  );
  // Test 8: Filter by target_type exact match
  const targetTypeTarget: ICommunityPlatformModerationLog.ISummary["target_type"] =
    defaultResponse.data[0].target_type;
  const targetTypeFilterResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      apiConnection,
      {
        body: {
          target_type: targetTypeTarget,
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(targetTypeFilterResponse);
  TestValidator.predicate(
    "filter by target_type returns data",
    targetTypeFilterResponse.data.length > 0,
  );
  TestValidator.predicate(
    "filter by target_type matches all entries",
    targetTypeFilterResponse.data.every(
      (log) => log.target_type === targetTypeTarget,
    ),
  );
  // Test 9: Filter by target_id exact match
  const targetIdTarget = defaultResponse.data[0].target_id;
  const targetIdFilterResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      apiConnection,
      {
        body: {
          target_id: targetIdTarget,
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(targetIdFilterResponse);
  TestValidator.predicate(
    "filter by target_id returns data",
    targetIdFilterResponse.data.length > 0,
  );
  TestValidator.equals(
    "filter by target_id matches",
    targetIdFilterResponse.data[0].target_id,
    targetIdTarget,
  );
  // Test 10: Date range filtering - use actual timestamps from existing data
  // Get a date range from existing logs
  const logsSortedByDate = [...defaultResponse.data].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  // Use the earliest and latest dates from the sorted logs with adjustment
  if (logsSortedByDate.length >= 2) {
    const earliestDate = new Date(logsSortedByDate[0].created_at);
    const latestDate = new Date(
      logsSortedByDate[logsSortedByDate.length - 1].created_at,
    );
    // Create a date range within existing data
    const startDate = new Date(
      earliestDate.getTime() + 1000 * 60,
    ).toISOString(); // Add 1 minute
    const endDate = new Date(latestDate.getTime() - 1000 * 60).toISOString(); // Subtract 1 minute
    const dateRangeFilterResponse =
      await api.functional.communityPlatform.admin.moderation.logs.index(
        apiConnection,
        {
          body: {
            start_date: startDate,
            end_date: endDate,
          } satisfies ICommunityPlatformModerationLog.IRequest,
        },
      );
    typia.assert(dateRangeFilterResponse);
    TestValidator.predicate(
      "date range filtering returns data",
      dateRangeFilterResponse.data.length > 0,
    );
    TestValidator.predicate(
      "all dates in range",
      dateRangeFilterResponse.data.every(
        (log) =>
          new Date(log.created_at) >= new Date(startDate) &&
          new Date(log.created_at) <= new Date(endDate),
      ),
    );
  }
  // Test 11: Invalid sort_by value (should default to timestamp descending)
  const invalidSortResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      apiConnection,
      {
        body: {
          sort_by: "non_existent_field",
          sort_order: "asc",
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(invalidSortResponse);
  // Since there's no sort property in the response, we verify the default behavior
  // by checking that results are sorted by timestamp descending (most recent first)
  if (invalidSortResponse.data.length >= 2) {
    const firstResult = invalidSortResponse.data[0];
    const secondResult = invalidSortResponse.data[1];
    TestValidator.predicate(
      "invalid sort_by defaults to timestamp descending",
      new Date(firstResult.created_at) >= new Date(secondResult.created_at),
    );
  }
  // Test 12: Pagination (limit and page)
  const paginatedResponse =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      apiConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit",
    paginatedResponse.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination data size",
    paginatedResponse.data.length,
    1,
  );
  // Test 13: Verify response structure against schema with typia.assert (already done in each call)
}
