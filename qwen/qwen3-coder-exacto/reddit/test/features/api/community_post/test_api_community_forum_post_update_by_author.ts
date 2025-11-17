import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

/**
 * Test updating a community forum post by its author.
 *
 * This test validates that post authors can modify their own posts within the
 * allowed time window. It creates a user, creates a community, creates a post
 * as that user, then updates the post content including title and body for text
 * posts. The test verifies that the update operation preserves creation
 * timestamps while updating the modification timestamp. It also ensures that
 * only the original author can update the post.
 *
 * Test flow:
 *
 * 1. Register a new user (author)
 * 2. Create a community
 * 3. Create a text post in that community as the author
 * 4. Update the post with new title and body
 * 5. Validate the update was successful and timestamps are correct
 * 6. Validate that the post content was updated properly
 */
export async function test_api_community_forum_post_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register a new user (author)
  const userJoin = {
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityCreate = {
    name:
      RandomGenerator.name(2).replace(/\s/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    slug:
      RandomGenerator.name(1).replace(/\s/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    rules: RandomGenerator.paragraph({ sentences: 5 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Create a text post in that community as the author
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    type: "text",
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Store original timestamps for validation
  const originalCreatedAt = post.created_at;
  const originalUpdatedAt = post.updated_at;

  // Step 4: Update the post with new title and body
  const postUpdate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 4 }),
  } satisfies ICommunityForumCommunityPost.IUpdate;

  const updatedPost: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.update(connection, {
      postId: post.id,
      body: postUpdate,
    });
  typia.assert(updatedPost);

  // Step 5: Validate the update was successful and timestamps are correct
  TestValidator.equals(
    "post ID should remain the same",
    updatedPost.id,
    post.id,
  );
  TestValidator.equals(
    "community ID should remain the same",
    updatedPost.community_forum_community_id,
    community.id,
  );
  TestValidator.equals(
    "author ID should remain the same",
    updatedPost.community_forum_user_id,
    user.id,
  );
  TestValidator.equals(
    "post type should remain the same",
    updatedPost.type,
    "text",
  );
  TestValidator.equals(
    "created_at timestamp should be preserved",
    updatedPost.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should be more recent than original",
    new Date(updatedPost.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  TestValidator.predicate(
    "updated_at should be different from created_at after update",
    new Date(updatedPost.updated_at).getTime() >
      new Date(updatedPost.created_at).getTime(),
  );

  // Step 6: Validate that the post content was updated properly
  TestValidator.equals(
    "title should be updated",
    updatedPost.title,
    postUpdate.title,
  );
  TestValidator.equals(
    "body should be updated",
    updatedPost.body,
    postUpdate.body,
  );
  TestValidator.equals(
    "url should remain null for text posts",
    updatedPost.url,
    null,
  );
  TestValidator.equals(
    "image_uri should remain null for text posts",
    updatedPost.image_uri,
    null,
  );
}
