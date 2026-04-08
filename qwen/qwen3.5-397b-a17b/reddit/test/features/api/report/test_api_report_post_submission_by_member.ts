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
 * Test member post report submission workflow for community guideline violations.
 *
 * Validates the complete report filing process including member authentication, community setup, post creation, and report submission. Ensures that reports are properly created with pending status and contain all required metadata for moderator review.
 *
 * The test verifies that the report correctly references the reported post, includes the reporter's profile information, and maintains the proper initial state (pending status, null resolution fields). This workflow represents the primary mechanism for community members to flag inappropriate content for moderator attention.
 *
 * 1. Member registers and authenticates with the platform.
 * 2. Member creates a community to host the reportable content.
 * 3. Member subscribes to the community (required for posting).
 * 4. Member creates a text post within the community.
 * 5. Member files a report against the post with a violation reason.
 * 6. Validates report structure including status, reporter, reportedContent, and resolution fields.
 */
export async function test_api_report_post_submission_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a post that will be reported
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. File a report against the post
  const report = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "post",
        target_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(report);
  // 6. Validate report structure and content
  TestValidator.equals("report type", report.report_type, "post");
  TestValidator.equals("target post ID", report.reportedContent.id, post.id);
  TestValidator.equals("report status", report.status, "pending");
  TestValidator.equals("reporter ID", report.reporter.id, memberAuth.id);
  TestValidator.equals(
    "reporter username",
    report.reporter.username,
    memberAuth.username,
  );
  TestValidator.predicate(
    "resolved_at is null",
    report.resolved_at === null || report.resolved_at === undefined,
  );
  TestValidator.predicate("resolvedBy is null", report.resolvedBy === null);
  TestValidator.predicate("deleted_at is null", report.deleted_at === null);
  // Cast reportedContent to post summary since report_type is "post"
  const reportedPost = report.reportedContent as IRedditCommunityPost.ISummary;
  TestValidator.equals(
    "reported content title",
    reportedPost.title,
    post.title,
  );
  TestValidator.equals(
    "reported content post_type",
    reportedPost.post_type,
    typia.assert<"text" | "link" | "image" | null | undefined>(post.postType),
  );
}