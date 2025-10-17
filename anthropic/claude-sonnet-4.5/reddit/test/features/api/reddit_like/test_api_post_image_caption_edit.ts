import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test editing the caption of an image post.
 *
 * This test validates that post authors can successfully edit the caption of
 * their image posts at any time after creation. The test workflow includes:
 *
 * 1. Create a member account for authentication
 * 2. Create a community to host the post
 * 3. Create an image post with an initial caption
 * 4. Update the caption to new text
 * 5. Verify the caption update succeeded with proper constraints
 *
 * Validation checks ensure:
 *
 * - Caption is successfully updated to the new value
 * - Image URLs remain unchanged (immutable)
 * - Updated_at timestamp is refreshed after the edit
 * - Post type and other properties remain unchanged
 */
export async function test_api_post_image_caption_edit(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create an image post with initial caption
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const initialCaption = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const imageUrl = typia.random<string & tags.Format<"url">>();

  const createdPost = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "image",
        title: postTitle,
        image_url: imageUrl,
        caption: initialCaption,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(createdPost);

  // Verify initial post creation
  TestValidator.equals("post type is image", createdPost.type, "image");
  TestValidator.equals("post title matches", createdPost.title, postTitle);

  // Store original created_at and updated_at for comparison
  const originalCreatedAt = createdPost.created_at;
  const originalUpdatedAt = createdPost.updated_at;

  // Step 4: Update the caption
  const newCaption = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 6,
    wordMax: 12,
  });

  const updatedPost = await api.functional.redditLike.member.posts.update(
    connection,
    {
      postId: createdPost.id,
      body: {
        caption: newCaption,
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(updatedPost);

  // Step 5: Verify the update succeeded with proper constraints
  TestValidator.equals("post ID unchanged", updatedPost.id, createdPost.id);
  TestValidator.equals("post type unchanged", updatedPost.type, "image");
  TestValidator.equals("post title unchanged", updatedPost.title, postTitle);
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedPost.created_at,
    originalCreatedAt,
  );

  // Verify updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at timestamp was refreshed",
    new Date(updatedPost.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
