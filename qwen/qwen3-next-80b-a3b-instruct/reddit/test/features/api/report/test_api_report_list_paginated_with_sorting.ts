import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_report_list_paginated_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityCommunityOwner.IJoin;
  const ownerAuth = await authorize_community_owner_join(ownerConnection, {
    body: ownerCredentials,
  });
  // 2. Create 15 reports via the reporting endpoint
  // Since no report creation endpoint is provided, we assume reports exist
  // We'll simulate the existence of 15 reports with unique created_at timestamps
  // In a real scenario, these would be created via POST /reports endpoint
  // Create 15 reports with timestamps 1 hour apart, newest first
  const reports: IRedditCommunityCommentReport[] = ArrayUtil.repeat(
    15,
    (index) => {
      const createdAt = new Date(Date.now() - index * 3600000).toISOString();
      return {
        id: typia.random<string & tags.Format<"uuid">>(),
        comment_id: typia.random<string & tags.Format<"uuid">>(),
        reporter_id: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        status: "pending" as const,
        created_at: createdAt,
        updated_at: createdAt,
        resolved_at: null,
      } satisfies IRedditCommunityCommentReport;
    },
  );
  // 3. Construct request with pagination and sorting parameters
  const request: IRedditCommunityCommentReport.IRequest = {
    status: "pending",
    target_type: "comment",
    sortBy: "newest",
    page: 1,
    limit: 10,
  };
  // 4. Execute the report list request
  const response: IPageIRedditCommunityCommentReport =
    await api.functional.redditCommunity.communityOwner.reports.index(
      ownerConnection,
      { body: request },
    );
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.equals("current page matches", response.pagination.current, 1);
  TestValidator.equals("limit matches", response.pagination.limit, 10);
  TestValidator.equals(
    "total records matches",
    response.pagination.records,
    15,
  );
  TestValidator.equals("total pages matches", response.pagination.pages, 2);
  // 6. Validate that returned reports are sorted by newest first
  // If our simulated reports are sorted newest to oldest: reports[0] (newest), reports[14] (oldest)
  // Then response[0] should be reports[0] (newest), response[9] should be reports[9]
  TestValidator.equals(
    "first report in response has latest creation time",
    response.data[0].created_at,
    reports[0].created_at,
  );
  TestValidator.equals(
    "second report in response has second latest creation time",
    response.data[1].created_at,
    reports[1].created_at,
  );
  TestValidator.equals(
    "last report in first page has 10th latest creation time",
    response.data[9].created_at,
    reports[9].created_at,
  );
  // 7. Test second page - should contain the 5 oldest reports
  const requestPage2: IRedditCommunityCommentReport.IRequest = {
    ...request,
    page: 2,
  };
  const responsePage2: IPageIRedditCommunityCommentReport =
    await api.functional.redditCommunity.communityOwner.reports.index(
      ownerConnection,
      { body: requestPage2 },
    );
  typia.assert(responsePage2);
  TestValidator.equals(
    "second page current page",
    responsePage2.pagination.current,
    2,
  );
  TestValidator.equals("second page limit", responsePage2.pagination.limit, 10);
  TestValidator.equals(
    "second page total records",
    responsePage2.pagination.records,
    15,
  );
  TestValidator.equals(
    "second page total pages",
    responsePage2.pagination.pages,
    2,
  );
  TestValidator.equals(
    "second page has 5 reports",
    responsePage2.data.length,
    5,
  );
  // Verify second page is sorted correctly
  TestValidator.equals(
    "first report in second page has 11th latest creation time",
    responsePage2.data[0].created_at,
    reports[10].created_at,
  );
  TestValidator.equals(
    "last report in second page has oldest creation time",
    responsePage2.data[4].created_at,
    reports[14].created_at,
  );
  // 8. Test different sort order - oldest first
  const requestOldest: IRedditCommunityCommentReport.IRequest = {
    ...request,
    sortBy: "oldest",
  };
  const responseOldest: IPageIRedditCommunityCommentReport =
    await api.functional.redditCommunity.communityOwner.reports.index(
      ownerConnection,
      { body: requestOldest },
    );
  typia.assert(responseOldest);
  // Oldest first should show reports[14] first
  TestValidator.equals(
    "oldest sort: first report has earliest creation time",
    responseOldest.data[0].created_at,
    reports[14].created_at,
  );
  TestValidator.equals(
    "oldest sort: last report has latest creation time",
    responseOldest.data[9].created_at,
    reports[5].created_at,
  );
}
