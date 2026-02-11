import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_reports_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const authResult = await authorize_community_moderator_join(
    moderatorConnection,
    { body: moderatorCredentials },
  );
  // Since we cannot create reports (no endpoint available), we'll query with empty test data
  // The system may have existing data, we just test pagination/sorting logic
  // Test pagination: newest first, page 1, limit 10
  const reportRequestNewestPage1: IRedditCommunityCommentReport.IRequest = {
    status: "pending",
    target_type: "comment",
    sortBy: "newest",
    page: 1,
    limit: 10,
  };
  const responseNewestPage1 =
    await api.functional.redditCommunity.communityModerator.reports.index(
      moderatorConnection,
      { body: reportRequestNewestPage1 },
    );
  typia.assert(responseNewestPage1);
  // Verify first page has at most 10 reports
  TestValidator.equals(
    "first page limit",
    responseNewestPage1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page items <= limit",
    responseNewestPage1.data.length <= 10,
  );
  // Verify items are ordered by newest if any exist
  if (responseNewestPage1.data.length > 1) {
    for (let i = 0; i < responseNewestPage1.data.length - 1; i++) {
      const current = new Date(responseNewestPage1.data[i].created_at);
      const next = new Date(responseNewestPage1.data[i + 1].created_at);
      TestValidator.predicate(
        "newest order: item i >= item i+1",
        current >= next,
      );
    }
  }
  // Test pagination: page 2, limit 10 (verify continuation)
  const reportRequestNewestPage2: IRedditCommunityCommentReport.IRequest = {
    status: "pending",
    target_type: "comment",
    sortBy: "newest",
    page: 2,
    limit: 10,
  };
  const responseNewestPage2 =
    await api.functional.redditCommunity.communityModerator.reports.index(
      moderatorConnection,
      { body: reportRequestNewestPage2 },
    );
  typia.assert(responseNewestPage2);
  // Verify second page has at most 10 reports
  TestValidator.equals(
    "second page limit",
    responseNewestPage2.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "second page items <= limit",
    responseNewestPage2.data.length <= 10,
  );
  // Verify consistency: If both pages have data, then first item on page2 <= last item on page1
  if (
    responseNewestPage1.data.length > 0 &&
    responseNewestPage2.data.length > 0
  ) {
    const lastOnPage1 = new Date(
      responseNewestPage1.data[responseNewestPage1.data.length - 1].created_at,
    );
    const firstOnPage2 = new Date(responseNewestPage2.data[0].created_at);
    TestValidator.predicate(
      "pagination continuity: page 2 first <= page 1 last",
      firstOnPage2 <= lastOnPage1,
    );
  }
  // Test sorting: oldest first (ascending)
  const reportRequestOldest: IRedditCommunityCommentReport.IRequest = {
    status: "pending",
    target_type: "comment",
    sortBy: "oldest",
    page: 1,
    limit: 10,
  };
  const responseOldest =
    await api.functional.redditCommunity.communityModerator.reports.index(
      moderatorConnection,
      { body: reportRequestOldest },
    );
  typia.assert(responseOldest);
  // Verify oldest is in ascending order if any exist
  if (responseOldest.data.length > 1) {
    for (let i = 0; i < responseOldest.data.length - 1; i++) {
      const current = new Date(responseOldest.data[i].created_at);
      const next = new Date(responseOldest.data[i + 1].created_at);
      TestValidator.predicate(
        "oldest order: item i <= item i+1",
        current <= next,
      );
    }
  }
  // Verify pagination metadata consistency
  const allReportsResponse =
    await api.functional.redditCommunity.communityModerator.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "comment",
          sortBy: "newest",
          page: 1,
          limit: 100, // Use high limit to get all
        },
      },
    );
  typia.assert(allReportsResponse);
  // Verify pagination records and pages make sense
  TestValidator.predicate(
    "total records >= 0",
    allReportsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages >= 0",
    allReportsResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page >= 1",
    allReportsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit >= 1",
    allReportsResponse.pagination.limit >= 1,
  );
  // If we have any reports, confirm first item in newest corresponds to last item in oldest
  if (allReportsResponse.data.length > 1) {
    const newestFirst = new Date(allReportsResponse.data[0].created_at);
    const oldestLast = new Date(
      responseOldest.data[responseOldest.data.length - 1].created_at,
    );
    if (responseOldest.data.length > 0) {
      TestValidator.equals(
        "newest first matches oldest last",
        newestFirst.valueOf(),
        oldestLast.valueOf(),
      );
    }
  }
}
