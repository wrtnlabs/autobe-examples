import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import type { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test member reporting a comment created by another member.
 *
 * Validates the comment reporting workflow where one member can report inappropriate content from another member's comment. The test ensures proper separation of reporter and content author identities, validates report creation with correct target type, and verifies the report contains all required fields for moderator review.
 *
 * The workflow tests the complete reporting flow including user registration, community setup, content creation, and report submission. Special attention is given to verifying that the report correctly identifies the comment as the target and includes full comment details for moderation.
 *
 * 1. Register comment author member with unique credentials.
 * 2. Create a community for posting content.
 * 3. Author subscribes to the community to enable posting.
 * 4. Author creates a text post in the community.
 * 5. Author creates a comment on the post.
 * 6. Register reporter member with different credentials.
 * 7. Reporter submits report targeting the comment with valid reason.
 * 8. Validates report contains correct fields: ID, reporter summary, actor_type 'comment', reason, status 'pending', and commentTarget with full comment details.
 */
export async function test_api_report_comment_by_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register comment author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(author);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    authorConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Author subscribes to community
  const subscription =
    await generate_random_reddit_like_member_subscriptions_create(
      authorConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Author creates a text post
  const post = await generate_random_reddit_like_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Author creates a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      authorConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Register reporter member (different from author)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(reporter);
  // 7. Reporter submits report targeting the comment
  const report = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        targetType: "comment",
        targetId: comment.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 8. Validate report structure and business logic
  TestValidator.equals("reporter matches", report.member.id, reporter.id);
  TestValidator.equals("target type is comment", report.actor_type, "comment");
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.predicate("reason is non-empty", report.reason.length > 0);
  TestValidator.equals(
    "comment target exists",
    report.commentTarget !== null && report.commentTarget !== undefined,
    true,
  );
  TestValidator.equals(
    "comment target ID matches",
    report.commentTarget?.comment?.id,
    comment.id,
  );
}