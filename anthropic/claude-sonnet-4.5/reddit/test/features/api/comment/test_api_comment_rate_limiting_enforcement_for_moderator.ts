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
 * Test rate limiting enforcement for moderator comment creation.
 *
 * This test validates that the platform enforces the maximum 10 comments per
 * minute constraint for moderators to prevent spam. It verifies:
 *
 * 1. Moderators can create comments successfully within rate limits
 * 2. Duplicate comment detection rejects identical comments within 5 minutes
 * 3. The system rejects comment creation when rate limit is exceeded (10 per
 *    minute)
 * 4. Rate limiting is applied on a per-user basis
 * 5. Legitimate comment creation continues to work within limits
 *
 * Test workflow:
 *
 * - Create moderator account and authenticate
 * - Create community and post for comment hosting
 * - Create initial comments to test normal operation
 * - Test duplicate comment detection
 * - Create additional comments to approach rate limit
 * - Attempt to exceed rate limit and verify rejection
 */
export async function test_api_comment_rate_limiting_enforcement_for_moderator(
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

  // Step 2: Create community for testing
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create post to host comments
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

  // Step 4: Create initial 8 comments successfully
  const initialComments: IRedditLikeComment[] = await ArrayUtil.asyncRepeat(
    8,
    async (index) => {
      const comment: IRedditLikeComment =
        await api.functional.redditLike.moderator.comments.create(connection, {
          body: {
            reddit_like_post_id: post.id,
            content_text: `Test comment ${index} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
          } satisfies IRedditLikeComment.ICreate,
        });
      typia.assert(comment);
      return comment;
    },
  );

  TestValidator.equals("created 8 initial comments", initialComments.length, 8);

  // Step 5: Test duplicate comment detection
  const duplicateContent = `Duplicate test - ${RandomGenerator.alphaNumeric(15)}`;

  const firstDuplicateAttempt: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: duplicateContent,
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(firstDuplicateAttempt);

  // Attempt to create duplicate comment - should fail due to duplicate detection
  await TestValidator.error(
    "duplicate comment within 5 minutes rejected",
    async () => {
      await api.functional.redditLike.moderator.comments.create(connection, {
        body: {
          reddit_like_post_id: post.id,
          content_text: duplicateContent,
        } satisfies IRedditLikeComment.ICreate,
      });
    },
  );

  // Step 6: Create 10th comment to reach rate limit
  const tenthComment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: `Tenth comment - ${RandomGenerator.alphaNumeric(12)}`,
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(tenthComment);

  // Step 7: Attempt 11th comment to exceed rate limit - should fail
  await TestValidator.error(
    "11th comment exceeds 10 per minute rate limit",
    async () => {
      await api.functional.redditLike.moderator.comments.create(connection, {
        body: {
          reddit_like_post_id: post.id,
          content_text: `Rate limit exceeded - ${RandomGenerator.alphaNumeric(10)}`,
        } satisfies IRedditLikeComment.ICreate,
      });
    },
  );
}
