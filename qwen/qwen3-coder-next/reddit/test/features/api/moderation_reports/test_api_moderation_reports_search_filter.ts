import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationReport";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_reports_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Test search and filtering functionality on moderation reports
  // Test 1: Search with no filters (should return all reports)
  const allReports = await api.functional.redditClone.moderation_reports.index(
    moderatorConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCloneModerationReport.IRequest,
    },
  );
  typia.assert(allReports);
  TestValidator.predicate(
    "should have valid pagination structure",
    allReports.pagination !== undefined,
  );
  TestValidator.predicate(
    "should have data array",
    Array.isArray(allReports.data),
  );
  // Test 2: Search by status filter
  const pendingReports =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.predicate(
    "should have valid pagination for pending reports",
    pendingReports.pagination !== undefined,
  );
  // Test 3: Search by content type filter
  const postReports = await api.functional.redditClone.moderation_reports.index(
    moderatorConnection,
    {
      body: {
        content_type: "post",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneModerationReport.IRequest,
    },
  );
  typia.assert(postReports);
  TestValidator.predicate(
    "should have valid pagination for post reports",
    postReports.pagination !== undefined,
  );
  // Test 4: Combined filters (status + content_type)
  const combinedReports =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          content_type: "comment",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(combinedReports);
  TestValidator.predicate(
    "should have valid pagination for combined filters",
    combinedReports.pagination !== undefined,
  );
  // Test 5: Search with text search
  const searchReports =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          search: moderator.username,
          page: 1,
          limit: 10,
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(searchReports);
  TestValidator.predicate(
    "should have valid pagination for search results",
    searchReports.pagination !== undefined,
  );
  // Test 6: Time range filter
  const timeFiltered =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          created_at_from: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          created_at_to: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(timeFiltered);
  TestValidator.predicate(
    "should have valid pagination for time filtered results",
    timeFiltered.pagination !== undefined,
  );
  // Test 7: Pagination with different page/limit values
  const paginated = await api.functional.redditClone.moderation_reports.index(
    moderatorConnection,
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies IRedditCloneModerationReport.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.predicate(
    "should have valid pagination for second page",
    paginated.pagination !== undefined,
  );
  TestValidator.equals(
    "should have correct page number",
    paginated.pagination.current,
    2,
  );
  TestValidator.equals(
    "should have correct limit",
    paginated.pagination.limit,
    20,
  );
}
