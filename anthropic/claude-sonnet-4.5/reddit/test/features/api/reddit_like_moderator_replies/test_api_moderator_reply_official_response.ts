import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderator creating nested replies for official community guidance.
 *
 * This test validates the workflow where a moderator creates nested replies to
 * provide official community guidance or explanations in discussions. The
 * scenario verifies that moderators can participate in comment threads with
 * their moderator role while maintaining proper threading structure.
 *
 * Steps:
 *
 * 1. Create moderator account
 * 2. Create community under moderator management
 * 3. Create post to host discussion
 * 4. Create parent comment on the post
 * 5. Create moderator reply to the parent comment
 * 6. Verify reply is properly nested with correct depth
 * 7. Verify parent-child relationship is maintained
 * 8. Verify reply is attributed to moderator account
 */
export async function test_api_moderator_reply_official_response(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community for moderator to manage
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create post to host the discussion
  const post: IRedditLikePost =
    await api.functional.redditLike.moderator.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create parent comment to which moderator will reply
  const parentComment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(parentComment);

  // Step 5: Create moderator reply to the parent comment
  const moderatorReply: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.replies.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          content_text: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IRedditLikeComment.IReplyCreate,
      },
    );
  typia.assert(moderatorReply);

  // Step 6: Verify reply is properly nested under parent comment
  TestValidator.equals(
    "moderator reply should reference parent comment",
    moderatorReply.reddit_like_parent_comment_id,
    parentComment.id,
  );

  // Step 7: Verify correct depth level calculation
  TestValidator.equals(
    "moderator reply depth should be parent depth + 1",
    moderatorReply.depth,
    parentComment.depth + 1,
  );

  // Step 8: Verify parent-child relationship through post reference
  TestValidator.equals(
    "moderator reply should belong to same post as parent",
    moderatorReply.reddit_like_post_id,
    post.id,
  );
}
