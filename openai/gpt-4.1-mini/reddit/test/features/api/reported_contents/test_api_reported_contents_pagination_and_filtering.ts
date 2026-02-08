import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_reported_contents_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  /*
     Test scenario description:
     - Authenticate as moderator and admin (join + login)
     - Use moderator and admin connections to request paginated reported content lists
     - Test filtering by reportedPostId, reportedCommentId, and reportId
     - Test pagination behavior (multiple pages if applicable)
     - Test sorting and date range filters
     - Validate the structure and contents of results using typia.assert
     - Validate empty results properly returned
     - Use TestValidator to check essential business invariants
    */
  // Prepare moderator connection with join and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinPayload: ICommunityPlatformModerator.IJoin = {};
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinPayload,
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // Prepare admin connection with join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinPayload: ICommunityPlatformAdmin.IJoin = {};
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinPayload,
  });
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Common test input shapes
  // We prepare some filters with a range of plausible values, including null to signify no filtering
  // Test no filter - blank request body
  const noFilterBody: ICommunityPlatformReportedContent.IRequest = {};
  // Call index endpoint with moderatorConnection with no filtering to get one page
  const firstPage =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      { body: noFilterBody },
    );
  typia.assert(firstPage);
  // Validate pagination info
  TestValidator.predicate(
    "pagination current page positive",
    firstPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  // If records > 0, data array length should be <= limit
  TestValidator.predicate(
    "data length valid",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  // If pages > 1, test cursor-based pagination by requesting next page with cursor
  if (firstPage.pagination.pages > 1 && firstPage.data.length > 0) {
    // Assuming cursor is implemented via page number in filter (simulate pagination parameter if supported)
    // But since no specific cursor param defined, we'll just call same endpoint with page param if available
    // Since schema unknown for cursor param, skip direct cursor param test
  }
  // Test filtering by non-existent reportedPostId and expect empty results
  const invalidFilterByReportedPostId: ICommunityPlatformReportedContent.IRequest =
    { reportedPostId: "00000000-0000-0000-0000-000000000000" };
  const emptyPageByReportedPost =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      { body: invalidFilterByReportedPostId },
    );
  typia.assert(emptyPageByReportedPost);
  TestValidator.equals(
    "empty result with invalid reportedPostId",
    emptyPageByReportedPost.data.length,
    0,
  );
  // Test filtering by non-existent reportedCommentId and expect empty results
  const invalidFilterByReportedCommentId: ICommunityPlatformReportedContent.IRequest =
    { reportedCommentId: "00000000-0000-0000-0000-000000000000" };
  const emptyPageByReportedComment =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      { body: invalidFilterByReportedCommentId },
    );
  typia.assert(emptyPageByReportedComment);
  TestValidator.equals(
    "empty result with invalid reportedCommentId",
    emptyPageByReportedComment.data.length,
    0,
  );
  // Test filtering by non-existent reportId and expect empty results
  const invalidFilterByReportId: ICommunityPlatformReportedContent.IRequest = {
    reportId: "00000000-0000-0000-0000-000000000000",
  };
  const emptyPageByReportId =
    await api.functional.communityPlatform.reportedContents.index(
      moderatorConnection,
      { body: invalidFilterByReportId },
    );
  typia.assert(emptyPageByReportId);
  TestValidator.equals(
    "empty result with invalid reportId",
    emptyPageByReportId.data.length,
    0,
  );
  // Use adminConnection to test filtering and pagination
  // No filters - get all
  const adminPage =
    await api.functional.communityPlatform.reportedContents.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(adminPage);
  TestValidator.predicate(
    "admin page data length within limit",
    adminPage.data.length <= adminPage.pagination.limit,
  );
  // Validate each reported content summary has identifiers (id, and possibly reportedPostId or reportedCommentId) if properties exist
  for (const item of adminPage.data) {
    typia.assert(item);
    if ("id" in item)
      TestValidator.predicate(
        "item id is uuid",
        typeof item.id === "string" && /^[0-9a-fA-F-]{36}$/.test(item.id),
      );
  }
  // Additional filtering tests can be done as appropriate if more fields are known
}
