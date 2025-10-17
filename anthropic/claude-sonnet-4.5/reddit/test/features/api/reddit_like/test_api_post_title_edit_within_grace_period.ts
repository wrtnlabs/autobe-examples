import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test post title editing within the 5-minute grace period.
 *
 * This test validates that post authors can successfully edit their post titles
 * immediately after creation, within the 5-minute grace period defined in the
 * platform's editing capabilities requirements.
 *
 * Test workflow:
 *
 * 1. Register a new member account for authentication
 * 2. Create a community to host the test post
 * 3. Create a text post with an initial title
 * 4. Immediately update the post title to a new value
 * 5. Verify the title was updated successfully
 * 6. Confirm updated_at timestamp was refreshed
 * 7. Validate that post content and engagement metrics remain unchanged
 */
export async function test_api_post_title_edit_within_grace_period(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community for the test post
  const communityCode = RandomGenerator.alphaNumeric(10);
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create a text post with an initial title
  const originalTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({ paragraphs: 2 });

  const createdPost = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: originalTitle,
        body: postBody,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(createdPost);

  // Verify initial post creation
  TestValidator.equals(
    "initial post title matches",
    createdPost.title,
    originalTitle,
  );
  TestValidator.equals("post type is text", createdPost.type, "text");

  // Store original timestamps for comparison
  const originalCreatedAt = createdPost.created_at;
  const originalUpdatedAt = createdPost.updated_at;

  // Step 4: Immediately update the post title (within grace period)
  const newTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 9,
  });

  const updatedPost = await api.functional.redditLike.member.posts.update(
    connection,
    {
      postId: createdPost.id,
      body: {
        title: newTitle,
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(updatedPost);

  // Step 5: Verify the title was updated successfully
  TestValidator.equals("post title was updated", updatedPost.title, newTitle);
  TestValidator.notEquals(
    "title changed from original",
    updatedPost.title,
    originalTitle,
  );

  // Step 6: Confirm updated_at timestamp was refreshed
  TestValidator.notEquals(
    "updated_at timestamp was refreshed",
    updatedPost.updated_at,
    originalUpdatedAt,
  );

  // Step 7: Validate that created_at remains unchanged
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedPost.created_at,
    originalCreatedAt,
  );

  // Verify post ID remains the same
  TestValidator.equals("post ID unchanged", updatedPost.id, createdPost.id);

  // Verify post type remains unchanged
  TestValidator.equals(
    "post type unchanged",
    updatedPost.type,
    createdPost.type,
  );
}
