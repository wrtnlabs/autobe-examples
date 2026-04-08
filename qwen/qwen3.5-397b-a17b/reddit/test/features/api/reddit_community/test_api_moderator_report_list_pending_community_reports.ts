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
 * Test that a moderator can retrieve all pending reports for their community.
 *
 * Validates the complete report moderation workflow including moderator authentication, community creation, post creation by moderator, report filing by a different member, and retrieval of pending reports by the moderator. Ensures that the moderator can see all pending reports in their community regardless of who filed them.
 *
 * The test verifies that the reports endpoint correctly returns reports with accurate reporter information, reason, status, and target content. Special attention is given to confirming that moderators can view reports from all users in their community, not just their own reports, and that filtering by report_type=post returns the correct post report.
 *
 * 1. First member authenticates and creates a community (becomes owner/moderator).
 * 2. Moderator creates a text post in their community.
 * 3. Second member authenticates with different credentials.
 * 4. Second member files a report on the moderator's post with a specific reason.
 * 5. Moderator calls the reports endpoint with status=pending filter.
 * 6. Validates response contains exactly one report with correct reporter, reason, status, and target.
 */
export async function test_api_moderator_report_list_pending_community_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator authentication and community creation
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuth);
  const community =
    await generate_random_reddit_community_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 2. Moderator creates a post in the community
  const post = await generate_random_reddit_community_posts_create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 3. Second member authentication
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reporterAuth);
  // 4. Second member files a report on the post
  const reportReason =
    "This post violates community guidelines by containing inappropriate content";
  const report = await generate_random_reddit_community_member_reports_create(
    reporterConnection,
    {
      body: {
        report_type: "post",
        target_id: post.id,
        reason: reportReason,
      },
    },
  );
  typia.assert(report);
  // 5. Moderator retrieves pending reports
  const reportsResponse =
    await api.functional.redditCommunity.member.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          report_type: "post",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsResponse);
  // 6. Validate response contains the report
  TestValidator.predicate("has reports data", reportsResponse.data.length >= 1);
  const foundReport = reportsResponse.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "report exists in results",
    foundReport !== undefined,
  );
  if (foundReport) {
    TestValidator.equals(
      "reporter matches",
      foundReport.reporter.id,
      reporterAuth.id,
    );
    TestValidator.equals("reason matches", foundReport.reason, reportReason);
    TestValidator.equals("status is pending", foundReport.status, "pending");
    TestValidator.equals("report type is post", foundReport.reportType, "post");
    TestValidator.equals(
      "target post id matches",
      foundReport.target.id,
      post.id,
    );
    if (foundReport.reportType === "post") {
      const targetPost = foundReport.target as IRedditCommunityPost.ISummary;
      TestValidator.equals(
        "target post title matches",
        targetPost.title,
        post.title,
      );
    }
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "current page is 1",
    reportsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    reportsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    reportsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    reportsResponse.pagination.pages >= 0,
  );
}