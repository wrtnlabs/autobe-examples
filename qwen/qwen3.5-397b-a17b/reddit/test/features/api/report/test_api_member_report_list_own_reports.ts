import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

/**
 * Test member retrieval of their own filed reports with pagination and filtering.
 *
 * Validates the complete report filing and retrieval workflow including member authentication, community creation, post creation, report submission, and report list retrieval. Ensures that the member can successfully retrieve their own reports with correct metadata and filtering capabilities.
 *
 * The test verifies that filed reports contain accurate information including the report type, status, reason text, reporter identity, and target content reference. Pagination metadata is validated to ensure proper page structure.
 *
 * 1. Member registers and authenticates with unique credentials.
 * 2. Member creates a community to host content for reporting.
 * 3. Member creates a text post in the community.
 * 4. Member files a report against their own post with a specific reason.
 * 5. Member retrieves their reports list and validates the report appears with pending status.
 * 6. Member filters reports by status=pending and confirms the report is returned.
 * 7. Member filters reports by status=approved and confirms empty results since report is still pending.
 */
export async function test_api_member_report_list_own_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. File a report on the post
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "post",
        target_id: post.id,
        reason: reportReason,
      },
    },
  );
  typia.assert(report);
  // 5. Retrieve member's own reports
  const reportsResponse =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    reportsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    reportsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    reportsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    reportsResponse.pagination.pages >= 0,
  );
  // Validate report exists in the list
  TestValidator.predicate(
    "reports list is not empty",
    reportsResponse.data.length > 0,
  );
  const filedReport = reportsResponse.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "filed report exists in list",
    filedReport !== undefined,
  );
  if (filedReport) {
    // Validate report details
    TestValidator.equals("report type matches", filedReport.reportType, "post");
    TestValidator.equals(
      "report status is pending",
      filedReport.status,
      "pending",
    );
    TestValidator.equals(
      "report reason matches",
      filedReport.reason,
      reportReason,
    );
    TestValidator.equals(
      "reporter id matches",
      filedReport.reporter.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "reporter username matches",
      filedReport.reporter.username,
      memberAuth.username,
    );
    TestValidator.predicate(
      "target is post type",
      filedReport.reportType === "post",
    );
    TestValidator.equals(
      "target post id matches",
      (filedReport.target as IRedditCommunityPost.ISummary).id,
      post.id,
    );
  }
  // 6. Filter by status=pending should return the report
  const pendingReports =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  const pendingReport = pendingReports.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "pending filter returns the report",
    pendingReport !== undefined,
  );
  // 7. Filter by status=approved should return empty (report is still pending)
  const approvedReports =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  const approvedReport = approvedReports.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "approved filter returns empty for pending report",
    approvedReport === undefined,
  );
}
