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
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test the complete workflow of a member reporting a comment for community guideline violations.
 *
 * Validates the end-to-end process of content moderation through member reporting. A member account is created and authenticated, a community is established with the member subscribed, a post is created within the community, and a comment is added to that post. The member then files a report against the comment specifying the violation reason.
 *
 * The test verifies that the report is created with pending status, the reporter information is correctly captured, the reported content references the original comment, and resolution fields remain null until a moderator takes action. This enables community-driven moderation by allowing members to flag violating content for moderator review.
 *
 * 1. Member registers and authenticates with the platform.
 * 2. Member creates a community to host the content.
 * 3. Member subscribes to their own community.
 * 4. Member creates a text post within the community.
 * 5. Member creates a comment on the post.
 * 6. Member files a report against the comment with report_type='comment'.
 * 7. Validates report structure including status, reporter, reportedContent, and timestamps.
 */
export async function test_api_report_comment_submission_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
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
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        },
      },
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
  // 4. Create a post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
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
  // 5. Create a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(comment);
  // 6. File a report against the comment
  const report = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "comment",
        target_id: comment.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(report);
  // 7. Validate report structure
  TestValidator.equals("report type is comment", report.report_type, "comment");
  TestValidator.predicate("reason is not empty", report.reason.length > 0);
  TestValidator.equals("status is pending", report.status, "pending");
  TestValidator.equals(
    "reporter ID matches member",
    report.reporter.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "reporter username matches",
    report.reporter.username,
    memberAuth.username,
  );
  // Validate reportedContent is a comment (has comment-specific fields)
  const reportedComment =
    report.reportedContent as IRedditCommunityComment.ISummary;
  TestValidator.equals(
    "reported content ID matches comment",
    reportedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "reported content matches original",
    reportedComment.content,
    comment.content,
  );
  TestValidator.predicate(
    "resolved_at is null or undefined",
    report.resolved_at === null || report.resolved_at === undefined,
  );
  TestValidator.equals("resolvedBy is null", report.resolvedBy, null);
  TestValidator.predicate(
    "created_at is populated",
    report.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    report.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", report.deleted_at, null);
}
