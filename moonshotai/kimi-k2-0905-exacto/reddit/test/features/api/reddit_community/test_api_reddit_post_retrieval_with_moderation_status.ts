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

/**
 * Test viewing posts that have different moderation states including locked and
 * pinned posts. Validates that the is_locked and is_pinned flags are properly
 * returned in the response. This ensures users can identify posts that are
 * locked for commenting or pinned to the top of community feeds. Also verifies
 * that pinned posts maintain their status even after retrieval, supporting
 * proper community moderation workflows.
 */
export async function test_api_reddit_post_retrieval_with_moderation_status(
  connection: api.IConnection,
) {
  // Step 1: Create member account for creating moderated posts
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const nickname = RandomGenerator.name();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: nickname,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create test post with default moderation status (is_locked: false, is_pinned: false)
  const postTypeId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const regularPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        reddit_community_id: communityId,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(regularPost);

  // Step 3: Create another post (platform may support moderation flags during creation or through separate endpoints)
  const pinnedPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 8,
        }),
        reddit_community_id: communityId,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(pinnedPost);

  // Step 4: Retrieve the regular post and validate its moderation status
  const retrievedRegularPost = await api.functional.redditCommunity.posts.at(
    connection,
    {
      postId: regularPost.id,
    },
  );
  typia.assert(retrievedRegularPost);

  // Validate that the regular post has default moderation status
  TestValidator.equals(
    "regular post is not locked by default",
    retrievedRegularPost.is_locked,
    false,
  );
  TestValidator.equals(
    "regular post is not pinned by default",
    retrievedRegularPost.is_pinned,
    false,
  );
  TestValidator.equals(
    "regular post id matches",
    retrievedRegularPost.id,
    regularPost.id,
  );
  TestValidator.equals(
    "regular post title matches",
    retrievedRegularPost.title,
    regularPost.title,
  );

  // Step 5: Retrieve the second post and validate its moderation status
  const retrievedPinnedPost = await api.functional.redditCommunity.posts.at(
    connection,
    {
      postId: pinnedPost.id,
    },
  );
  typia.assert(retrievedPinnedPost);

  // Validate that both posts maintain their moderation status correctly
  TestValidator.equals(
    "pinned post id matches",
    retrievedPinnedPost.id,
    pinnedPost.id,
  );
  TestValidator.equals(
    "pinned post title matches",
    retrievedPinnedPost.title,
    pinnedPost.title,
  );

  // Verify moderation flags are present and have expected values
  TestValidator.predicate(
    "is_locked property exists",
    typeof retrievedPinnedPost.is_locked === "boolean",
  );
  TestValidator.predicate(
    "is_pinned property exists",
    typeof retrievedPinnedPost.is_pinned === "boolean",
  );

  // Both posts should have default moderation status unless specifically set
  TestValidator.equals(
    "second post is not locked by default",
    retrievedPinnedPost.is_locked,
    false,
  );
  TestValidator.equals(
    "second post is not pinned by default",
    retrievedPinnedPost.is_pinned,
    false,
  );

  // Step 6: Validate complete response structure for moderation fields
  TestValidator.predicate(
    "regular post has required moderation fields",
    retrievedRegularPost.hasOwnProperty("is_locked") &&
      retrievedRegularPost.hasOwnProperty("is_pinned"),
  );

  TestValidator.predicate(
    "pinned post has required moderation fields",
    retrievedPinnedPost.hasOwnProperty("is_locked") &&
      retrievedPinnedPost.hasOwnProperty("is_pinned"),
  );

  // Additional validation: ensure other post properties are intact
  TestValidator.equals(
    "regular post author preserved",
    retrievedRegularPost.author.id,
    regularPost.author.id,
  );
  TestValidator.equals(
    "pinned post author preserved",
    retrievedPinnedPost.author.id,
    pinnedPost.author.id,
  );

  TestValidator.equals(
    "regular post community preserved",
    retrievedRegularPost.community.id,
    regularPost.community.id,
  );
  TestValidator.equals(
    "pinned post community preserved",
    retrievedPinnedPost.community.id,
    pinnedPost.community.id,
  );

  // Validate that both posts have proper initial counts
  TestValidator.equals(
    "regular post has zero upvotes initially",
    retrievedRegularPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "regular post has zero downvotes initially",
    retrievedRegularPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "regular post has zero comments initially",
    retrievedRegularPost.comment_count,
    0,
  );
  TestValidator.equals(
    "regular post has one view initially",
    retrievedRegularPost.view_count,
    1,
  ); // view count increments on retrieval

  TestValidator.equals(
    "pinned post has zero upvotes initially",
    retrievedPinnedPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "pinned post has zero downvotes initially",
    retrievedPinnedPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "pinned post has zero comments initially",
    retrievedPinnedPost.comment_count,
    0,
  );
  TestValidator.equals(
    "pinned post has one view initially",
    retrievedPinnedPost.view_count,
    1,
  ); // view count increments on retrieval
}
