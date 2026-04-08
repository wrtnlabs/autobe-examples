import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test moderator retrieval of a post report in their community.
 *
 * Validates the complete report retrieval workflow including community ownership, member subscription, post creation, report filing, and moderator access to the report. Ensures that the report entity contains all required fields with correct values and that the polymorphic reportedContent resolves to the post summary.
 *
 * The test verifies that moderators can access reports for content in communities they moderate, and that the report includes proper references to both the reporter and the reported content.
 *
 * 1. Moderator (community owner) joins and creates a community.
 * 2. Reporter joins as a separate member.
 * 3. Reporter subscribes to the community.
 * 4. Reporter creates a text post in the community.
 * 5. Reporter files a report against the post with a reason.
 * 6. Moderator retrieves the report by ID.
 * 7. Validates report entity structure, report_type, reason, status, and relationships.
 */
export async function test_api_report_retrieval_by_moderator_for_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator (community owner) setup
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
  // 2. Reporter setup (different member)
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
  // 3. Reporter subscribes to the community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      reporterConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Reporter creates a text post in the community
  const post = await generate_random_reddit_community_posts_create(
    reporterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Reporter files a report against the post
  const reasonText =
    "This post violates community guidelines by containing inappropriate content.";
  const report = await generate_random_reddit_community_member_reports_create(
    reporterConnection,
    {
      body: {
        report_type: "post",
        target_id: post.id,
        reason: reasonText,
      },
    },
  );
  typia.assert(report);
  // 6. Moderator retrieves the report by ID
  const retrievedReport =
    await api.functional.redditCommunity.member.reports.at(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // 7. Validate report entity structure and content
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report type is post",
    retrievedReport.report_type,
    "post",
  );
  TestValidator.equals(
    "reason matches input",
    retrievedReport.reason,
    reasonText,
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
  TestValidator.equals("resolvedBy is null", retrievedReport.resolvedBy, null);
  TestValidator.equals(
    "resolved_at is null",
    retrievedReport.resolved_at,
    null,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedReport.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedReport.deleted_at === null,
  );
  // Validate reporter information
  TestValidator.equals(
    "reporter ID matches",
    retrievedReport.reporter.id,
    reporterAuth.id,
  );
  TestValidator.equals(
    "reporter username matches",
    retrievedReport.reporter.username,
    reporterAuth.username,
  );
  // Validate reported content is the post
  TestValidator.predicate(
    "reportedContent exists",
    retrievedReport.reportedContent !== undefined,
  );
  // Narrow the type using typia.assert since report_type is "post"
  const reportedPost = typia.assert<IRedditCommunityPost.ISummary>(
    retrievedReport.reportedContent,
  );
  TestValidator.equals(
    "reported content ID matches post",
    reportedPost.id,
    post.id,
  );
  TestValidator.equals(
    "reported content title matches",
    reportedPost.title,
    post.title,
  );
  TestValidator.equals(
    "reported content type is text",
    reportedPost.post_type,
    "text",
  );
}