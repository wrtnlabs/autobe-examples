import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_moderation_action_comment_removal_response(
  connection: api.IConnection,
) {
  // 1. Create Member Account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: "SecurePass123!",
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // 2. Create Community
  const communityCode = RandomGenerator.alphaNumeric(10);
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // 3. Create Post
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // 4. Create Comment
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. Submit Content Report
  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_comment_id: comment.id,
        community_id: community.id,
        content_type: "comment",
        violation_categories: "harassment,hate_speech",
        additional_context:
          "This comment contains harassment and violates community guidelines.",
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report);

  // 6. Create Moderator Account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: "ModPass456!",
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // 7. Create Moderation Action
  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report.id,
        affected_comment_id: comment.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "comment",
        removal_type: "community",
        reason_category: "harassment",
        reason_text:
          "This comment has been removed for violating our harassment policy. The comment contained targeted harassment against another user, which is explicitly prohibited by our community guidelines. Multiple reports confirmed the violation.",
        internal_notes:
          "Report #" +
          report.id +
          " confirmed harassment. Action taken after review.",
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // Validate moderation action properties
  TestValidator.equals(
    "moderation action type is remove",
    moderationAction.action_type,
    "remove",
  );
  TestValidator.equals(
    "moderation content type is comment",
    moderationAction.content_type,
    "comment",
  );
  TestValidator.equals(
    "moderation removal type is community",
    moderationAction.removal_type,
    "community",
  );
  TestValidator.equals(
    "moderation reason category is harassment",
    moderationAction.reason_category,
    "harassment",
  );
  TestValidator.predicate(
    "moderation reason text is detailed",
    moderationAction.reason_text.length > 50,
  );
  TestValidator.equals(
    "moderation action status is completed",
    moderationAction.status,
    "completed",
  );
}
