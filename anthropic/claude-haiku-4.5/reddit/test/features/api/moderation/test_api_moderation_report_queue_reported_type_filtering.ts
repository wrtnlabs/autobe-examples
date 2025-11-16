import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

export async function test_api_moderation_report_queue_reported_type_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(12),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://platform.example.com/auth/register",
    referrer: "https://platform.example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCredentials,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated successfully",
    moderator.id !== null && moderator.id !== undefined,
  );

  // Step 2: Retrieve all reports without type filter
  const allReportsResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(allReportsResponse);
  TestValidator.predicate(
    "all reports response is valid",
    allReportsResponse.data.length >= 0,
  );

  // Step 3: Filter reports by reported_type = "post"
  const postReportsResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        reported_type: "post",
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(postReportsResponse);
  TestValidator.predicate(
    "post reports filter returns valid response",
    postReportsResponse.data.length >= 0,
  );

  // Verify all returned reports have reported_post populated
  if (postReportsResponse.data.length > 0) {
    for (const report of postReportsResponse.data) {
      TestValidator.predicate(
        "report contains post data when filtering by post type",
        report.reported_post_id !== null &&
          report.reported_post_id !== undefined,
      );
    }
  }

  // Step 4: Filter reports by reported_type = "comment"
  const commentReportsResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        reported_type: "comment",
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(commentReportsResponse);
  TestValidator.predicate(
    "comment reports filter returns valid response",
    commentReportsResponse.data.length >= 0,
  );

  // Verify all returned reports have reported_comment populated
  if (commentReportsResponse.data.length > 0) {
    for (const report of commentReportsResponse.data) {
      TestValidator.predicate(
        "report contains comment data when filtering by comment type",
        report.reported_comment_id !== null &&
          report.reported_comment_id !== undefined,
      );
    }
  }

  // Step 5: Filter reports by reported_type = "member"
  const memberReportsResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        reported_type: "member",
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(memberReportsResponse);
  TestValidator.predicate(
    "member reports filter returns valid response",
    memberReportsResponse.data.length >= 0,
  );

  // Verify all returned reports have reported_member populated
  if (memberReportsResponse.data.length > 0) {
    for (const report of memberReportsResponse.data) {
      TestValidator.predicate(
        "report contains member data when filtering by member type",
        report.reported_member_id !== null &&
          report.reported_member_id !== undefined,
      );
    }
  }

  // Step 6: Filter with reported_type = null (no type filtering)
  const noTypeFilterResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        reported_type: null,
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(noTypeFilterResponse);
  TestValidator.predicate(
    "null type filter returns valid response",
    noTypeFilterResponse.data.length >= 0,
  );

  // Step 7: Validate filtering accuracy
  TestValidator.predicate(
    "type filtering is working - post + comment + member <= total with null filter",
    postReportsResponse.data.length +
      commentReportsResponse.data.length +
      memberReportsResponse.data.length <=
      noTypeFilterResponse.data.length,
  );

  // Step 8: Verify pagination works with type filters
  const pagedPostReports: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        reported_type: "post",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(pagedPostReports);
  TestValidator.predicate(
    "pagination limit is respected",
    pagedPostReports.data.length <= 10,
  );
}
