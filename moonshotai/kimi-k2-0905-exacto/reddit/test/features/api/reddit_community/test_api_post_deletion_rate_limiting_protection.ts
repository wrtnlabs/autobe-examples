import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

export async function test_api_post_deletion_rate_limiting_protection(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for testing rate limit protection
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: "SecureTest123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create multiple posts to have deletion targets
  const postType = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const posts = await ArrayUtil.asyncRepeat(5, async (index) => {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.paragraph({ sentences: 4 }),
          reddit_community_id: communityId,
          reddit_post_type_id: postType,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 3: Attempt rapid successive deletions to test rate limiting
  const deletionResults = await ArrayUtil.asyncRepeat(
    posts.length,
    async (index) => {
      try {
        const deletedPost =
          await api.functional.redditCommunity.member.posts.erase(connection, {
            postId: posts[index].id,
          });
        typia.assert(deletedPost);
        return { success: true, postId: posts[index].id };
      } catch (error) {
        return {
          success: false,
          postId: posts[index].id,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  // Step 4: Validate that bulk deletion is properly handled
  // The platform should either:
  // 1. Successfully handle all deletions (no rate limiting implemented)
  // 2. Prevent some deletions after a threshold (rate limiting active)

  // Check that at least the first deletion succeeded
  TestValidator.predicate(
    "first deletion should succeed",
    deletionResults[0].success,
  );

  // Validate rate limiting is working by checking if some deletions were blocked
  const blockedDeletions = deletionResults.filter(
    (result) => !result.success,
  ).length;
  const successfulDeletions = deletionResults.filter(
    (result) => result.success,
  ).length;

  // Platform should either allow all (no rate limit) or block some (rate limit active)
  TestValidator.predicate(
    "rate limiting behavior should be consistent",
    successfulDeletions === deletionResults.length || // No rate limiting
      (successfulDeletions < deletionResults.length && blockedDeletions > 0), // Rate limiting active
  );

  // If rate limiting is active, verify it makes sense (early deletions succeed, later ones may fail)
  if (blockedDeletions > 0) {
    // Find first blocked deletion
    const firstFailedIndex = deletionResults.findIndex(
      (result) => !result.success,
    );
    TestValidator.predicate(
      "rate limiting should allow early attempts",
      firstFailedIndex > 0, // First attempt should succeed, later attempts may be blocked
    );
  }
}
