import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportsDecision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_platform_moderator_reports_decisions_index_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario focusing on pagination edge cases including requesting the first page, a middle page, and a page beyond the last available page for report decisions on a community.
  // Validates correct page number handling and empty list response when the page exceeds available data.
  // Requires moderator authorization. Ensures that metadata such as total pages and records count are correct in the response.
  // 1. Moderator join and get authorized moderator connection
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    { body: {} },
  );
  typia.assert(moderatorAuthorized);
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${moderatorAuthorized.token.access}` },
  };
  // 2. Prepare a valid communityId with UUID format
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch first page, expect valid page 1 response with correct pagination metadata
  const firstPageRequest: ICommunityPlatformReportsDecision.IRequest = {
    page: 1,
    limit: 10,
    // Assuming dummy reportId and decision to satisfy the type
    reportId: typia.random<string & tags.Format<"uuid">>(),
    decision: "approve",
  };
  const firstPageResponse =
    await api.functional.communityPlatform.moderator.communities.reports.decisions.index(
      moderatorConnection,
      { communityId, body: firstPageRequest },
    );
  typia.assert(firstPageResponse);
  TestValidator.equals(
    "first page current page",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page limit positive",
    firstPageResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "first page pages not negative",
    firstPageResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page records not negative",
    firstPageResponse.pagination.records >= 0,
  );
  // 4. If no records, pages should be zero, and data empty
  if (firstPageResponse.pagination.records === 0) {
    TestValidator.equals(
      "first page data empty if no records",
      firstPageResponse.data.length,
      0,
    );
  }
  // 5. If records exist, test requesting a middle page if possible
  if (
    firstPageResponse.pagination.records > 0 &&
    firstPageResponse.pagination.pages > 1
  ) {
    const middlePage = Math.floor(firstPageResponse.pagination.pages / 2);
    const middlePageRequest: ICommunityPlatformReportsDecision.IRequest = {
      page: middlePage,
      limit: 10,
      reportId: typia.random<string & tags.Format<"uuid">>(),
      decision: "approve",
    };
    const middlePageResponse =
      await api.functional.communityPlatform.moderator.communities.reports.decisions.index(
        moderatorConnection,
        { communityId, body: middlePageRequest },
      );
    typia.assert(middlePageResponse);
    TestValidator.equals(
      "middle page current page",
      middlePageResponse.pagination.current,
      middlePage,
    );
    TestValidator.predicate(
      "middle page limit positive",
      middlePageResponse.pagination.limit > 0,
    );
    TestValidator.predicate(
      "middle page pages not negative",
      middlePageResponse.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "middle page records not negative",
      middlePageResponse.pagination.records >= 0,
    );
  }
  // 6. Request a page beyond the last page (page > pages), expect empty data and correct pagination
  const beyondLastPage = (firstPageResponse.pagination.pages ?? 0) + 1;
  const beyondLastPageRequest: ICommunityPlatformReportsDecision.IRequest = {
    page: beyondLastPage,
    limit: 10,
    reportId: typia.random<string & tags.Format<"uuid">>(),
    decision: "approve",
  };
  const beyondLastPageResponse =
    await api.functional.communityPlatform.moderator.communities.reports.decisions.index(
      moderatorConnection,
      { communityId, body: beyondLastPageRequest },
    );
  typia.assert(beyondLastPageResponse);
  TestValidator.equals(
    "beyond last page current page",
    beyondLastPageResponse.pagination.current,
    beyondLastPage,
  );
  TestValidator.equals(
    "beyond last page data empty",
    beyondLastPageResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond last page limit positive",
    beyondLastPageResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "beyond last page pages not negative",
    beyondLastPageResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "beyond last page records not negative",
    beyondLastPageResponse.pagination.records >= 0,
  );
}
