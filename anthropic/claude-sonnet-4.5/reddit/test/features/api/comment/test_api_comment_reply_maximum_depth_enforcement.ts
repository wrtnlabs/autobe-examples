import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test maximum comment nesting depth enforcement at 10 levels.
 *
 * Validates the platform's business rule that prevents comment threads from
 * exceeding 10 levels of nesting to maintain UI rendering performance and user
 * experience quality.
 *
 * Process:
 *
 * 1. Create authenticated member account
 * 2. Create community to host the test
 * 3. Create post for comment thread
 * 4. Create initial top-level comment (depth 0)
 * 5. Create nested replies up to depth 10, verifying depth calculation
 * 6. Attempt to create reply at depth 11 (should fail)
 * 7. Verify appropriate error message for maximum depth violation
 */
export async function test_api_comment_reply_maximum_depth_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community to host the deep comment thread test
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
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create post to contain the deeply nested comment structure
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
      body: typia.random<string & tags.MaxLength<40000>>(),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create initial top-level comment to start the nesting chain
  const topLevelComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<10000>
        >(),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(topLevelComment);
  TestValidator.equals(
    "top-level comment has depth 0",
    topLevelComment.depth,
    0,
  );

  // Step 5: Systematically create nested replies up to depth 10
  let currentComment: IRedditLikeComment = topLevelComment;

  for (let depth = 1; depth <= 10; depth++) {
    const reply =
      await api.functional.redditLike.member.comments.replies.create(
        connection,
        {
          commentId: currentComment.id,
          body: {
            content_text: typia.random<
              string & tags.MinLength<1> & tags.MaxLength<10000>
            >(),
          } satisfies IRedditLikeComment.IReplyCreate,
        },
      );
    typia.assert(reply);

    TestValidator.equals(
      `reply at depth ${depth} has correct depth value`,
      reply.depth,
      depth,
    );
    TestValidator.equals(
      `reply at depth ${depth} has correct parent`,
      reply.reddit_like_parent_comment_id,
      currentComment.id,
    );
    TestValidator.equals(
      `reply at depth ${depth} belongs to correct post`,
      reply.reddit_like_post_id,
      post.id,
    );

    currentComment = reply;
  }

  // Step 6: Attempt to create reply at depth 11 (should be denied)
  await TestValidator.error(
    "creating reply at depth 11 should fail with maximum depth error",
    async () => {
      await api.functional.redditLike.member.comments.replies.create(
        connection,
        {
          commentId: currentComment.id,
          body: {
            content_text: typia.random<
              string & tags.MinLength<1> & tags.MaxLength<10000>
            >(),
          } satisfies IRedditLikeComment.IReplyCreate,
        },
      );
    },
  );
}
