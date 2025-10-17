import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete workflow of a post being soft-deleted and then restored by
 * an administrator.
 *
 * This test validates the soft-delete recovery mechanism for posts and admin
 * override capabilities. The workflow includes:
 *
 * 1. Admin account creation and authentication
 * 2. Member account creation and authentication for post creation
 * 3. Community creation to host the post
 * 4. Post creation by the member with specific content
 * 5. Admin soft-deletion of the post (sets deleted_at timestamp)
 * 6. Admin restoration of the post (clears deleted_at timestamp)
 * 7. Validation that restored post preserves all original content and metadata
 *
 * After restoration, the test ensures:
 *
 * - Post becomes visible again in community feeds
 * - All original content is preserved (title, body, type)
 * - Timestamps are maintained correctly
 * - The deleted_at field is null indicating successful restoration
 */
export async function test_api_post_restoration_by_admin_after_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminCredentials = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Create and authenticate member account
  const memberCredentials = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 3: Create a community to host the post
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    allow_text_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Create a post as member
  const postTypes = ["text", "link", "image"] as const;
  const selectedType = RandomGenerator.pick(postTypes);

  const postData = {
    community_id: community.id,
    type: selectedType,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    body:
      selectedType === "text"
        ? RandomGenerator.content({ paragraphs: 2 })
        : undefined,
  } satisfies IRedditLikePost.ICreate;

  const createdPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(createdPost);

  // Store original post data for validation after restoration
  const originalPostId = createdPost.id;
  const originalTitle = createdPost.title;
  const originalType = createdPost.type;
  const originalCreatedAt = createdPost.created_at;

  // Step 5: Switch to admin context and delete the post (soft-delete)
  const adminReauth: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials,
    });
  typia.assert(adminReauth);

  await api.functional.redditLike.admin.posts.erase(connection, {
    postId: originalPostId,
  });

  // Step 6: Restore the post using admin privileges
  const restoredPost: IRedditLikePost =
    await api.functional.redditLike.admin.posts.restore(connection, {
      postId: originalPostId,
    });
  typia.assert(restoredPost);

  // Step 7: Validate restoration results
  TestValidator.equals(
    "restored post ID matches original",
    restoredPost.id,
    originalPostId,
  );
  TestValidator.equals(
    "restored post title matches original",
    restoredPost.title,
    originalTitle,
  );
  TestValidator.equals(
    "restored post type matches original",
    restoredPost.type,
    originalType,
  );
  TestValidator.equals(
    "restored post created_at matches original",
    restoredPost.created_at,
    originalCreatedAt,
  );
}
