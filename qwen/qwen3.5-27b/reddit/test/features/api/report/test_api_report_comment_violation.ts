import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that an authenticated member can successfully report a comment for violating community guidelines.
 *
 * Validates the complete comment reporting workflow including member authentication, community subscription, post creation, comment creation, and report submission. Ensures that reports are created with proper status, contain reporter information, and correctly reference the reported comment with its content, author, and parent post context.
 *
 * Special attention is given to verifying the prerequisite chain: member must be subscribed to a community before creating posts, and posts must exist before comments can be created and reported.
 *
 * 1. Authenticate as a member using join with email, password, and username.
 * 2. Subscribe to a community (required for creating posts).
 * 3. Create a post in the subscribed community.
 * 4. Create a comment on the post.
 * 5. Report the comment with a valid reason.
 * 6. Validate report has 'pending' status, reporter info, and comment reference.
 */
export async function test_api_report_comment_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Subscribe to a community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Create a post in the subscribed community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: subscription.community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Report the comment
  const report = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "comment",
        comment_id: comment.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCloneReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Validate report structure
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("report type is comment", report.report_type, "comment");
  TestValidator.equals(
    "reporter matches member",
    report.reporter.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "reported comment matches",
    report.reportedComment?.id,
    comment.id,
  );
  TestValidator.equals(
    "reported comment content matches",
    report.reportedComment?.content,
    comment.content,
  );
  TestValidator.equals(
    "reported comment author matches",
    report.reportedComment?.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "reported comment post matches",
    report.reportedComment?.post.id,
    post.id,
  );
  TestValidator.equals("reason is included", report.reason.length > 0, true);
}
