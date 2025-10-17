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
 * Test moderator nested reply comment creation with depth validation.
 *
 * This test validates the complete threaded discussion system by creating a
 * moderator account, community, post, parent comment, and then creating nested
 * reply comments to verify proper threading hierarchy, depth calculation, and
 * parent comment referencing.
 *
 * Steps:
 *
 * 1. Create moderator account via registration
 * 2. Create community for hosting the discussion
 * 3. Create post to host comment thread
 * 4. Create parent comment on the post
 * 5. Create nested reply comment referencing parent
 * 6. Validate reply structure and depth calculation
 */
export async function test_api_comment_nested_reply_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community for discussion
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10).toLowerCase(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
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
    });
  typia.assert(community);

  // Step 3: Create post to host comment thread
  const post: IRedditLikePost =
    await api.functional.redditLike.moderator.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create parent comment on the post
  const parentComment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(parentComment);

  // Validate parent comment is at depth 0
  TestValidator.equals(
    "parent comment depth should be 0",
    parentComment.depth,
    0,
  );
  TestValidator.equals(
    "parent comment should have no parent",
    parentComment.reddit_like_parent_comment_id,
    undefined,
  );

  // Step 5: Create nested reply comment referencing parent
  const replyComment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: parentComment.id,
        content_text: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(replyComment);

  // Step 6: Validate reply structure and depth calculation
  TestValidator.equals(
    "reply should reference parent comment",
    replyComment.reddit_like_parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply depth should be parent depth + 1",
    replyComment.depth,
    parentComment.depth + 1,
  );
  TestValidator.equals(
    "reply should belong to same post",
    replyComment.reddit_like_post_id,
    post.id,
  );
  TestValidator.predicate(
    "reply should have valid content",
    replyComment.content_text.length >= 1 &&
      replyComment.content_text.length <= 10000,
  );
  TestValidator.equals(
    "reply vote score initialized to 0",
    replyComment.vote_score,
    0,
  );
  TestValidator.equals(
    "reply edited flag should be false",
    replyComment.edited,
    false,
  );
}
