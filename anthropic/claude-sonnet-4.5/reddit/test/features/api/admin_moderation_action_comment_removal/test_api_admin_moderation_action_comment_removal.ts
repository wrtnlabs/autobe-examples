import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_admin_moderation_action_comment_removal(
  connection: api.IConnection,
) {
  // 1. Create a member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // 2. Member creates a community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // 3. Member creates a post in the community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // 4. Member adds a comment to the post
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. Submit a content report against the comment
  const contentReport = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_comment_id: comment.id,
        community_id: community.id,
        content_type: "comment",
        violation_categories: "harassment,hate_speech",
        additional_context: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(contentReport);

  // 6. Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // 7. Administrator creates a moderation action to remove the comment
  const moderationAction =
    await api.functional.redditLike.admin.moderation.actions.create(
      connection,
      {
        body: {
          report_id: contentReport.id,
          affected_comment_id: comment.id,
          community_id: community.id,
          action_type: "remove",
          content_type: "comment",
          removal_type: "platform-level",
          reason_category: "policy_violation",
          reason_text: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 5,
            wordMax: 12,
          }),
          internal_notes: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 8. Validate the moderation action
  TestValidator.equals(
    "action type is remove",
    moderationAction.action_type,
    "remove",
  );
  TestValidator.equals(
    "content type is comment",
    moderationAction.content_type,
    "comment",
  );
  TestValidator.equals(
    "removal type is platform-level",
    moderationAction.removal_type,
    "platform-level",
  );
  TestValidator.equals(
    "reason category is policy_violation",
    moderationAction.reason_category,
    "policy_violation",
  );
  TestValidator.predicate(
    "reason text is not empty",
    moderationAction.reason_text.length > 0,
  );
  TestValidator.equals(
    "action status is completed",
    moderationAction.status,
    "completed",
  );
}
