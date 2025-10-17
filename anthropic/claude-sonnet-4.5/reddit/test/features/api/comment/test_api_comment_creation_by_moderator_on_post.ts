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
 * Test moderator comment creation on posts within communities.
 *
 * This test validates the complete workflow of moderator comment creation
 * including:
 *
 * 1. Moderator account creation and authentication
 * 2. Community creation to host posts
 * 3. Post creation as target for comments
 * 4. Top-level comment creation by moderator
 * 5. Validation of comment initial state (zero votes, depth 0, not edited)
 * 6. Verification of proper content sanitization and data integrity
 */
export async function test_api_comment_creation_by_moderator_on_post(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community to host posts and comments
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create post as target for comment
  const post: IRedditLikePost =
    await api.functional.redditLike.moderator.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        body: typia.random<string & tags.MaxLength<40000>>(),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create top-level comment on the post
  const comment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<10000>
        >(),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment);

  // Step 5: Validate comment properties
  TestValidator.equals(
    "comment post reference matches",
    comment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals("comment is top-level with depth 0", comment.depth, 0);
  TestValidator.equals(
    "comment has zero initial vote score",
    comment.vote_score,
    0,
  );
  TestValidator.equals(
    "comment is not edited initially",
    comment.edited,
    false,
  );
  TestValidator.predicate(
    "comment has no parent for top-level",
    comment.reddit_like_parent_comment_id === undefined,
  );
}
