import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test that a member can delete their own post successfully.
 *
 * This test validates the soft deletion workflow where posts are marked as
 * deleted but preserved in the database for audit purposes. It ensures that
 * post creators have deletion privileges for their content and that deletion
 * timestamps are properly recorded.
 */
export async function test_api_post_deletion_by_creator(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post as the authenticated member
  // Note: Using a random UUID for community ID - this assumes the system allows
  // posts with any valid UUID format, even if the community doesn't exist
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    post_type: "text" as const,
    status: "published" as const,
    community_platform_community_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(createdPost);

  // Step 3: Delete the post using the erase API
  const deletedPost = await api.functional.communityPlatform.member.posts.erase(
    connection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(deletedPost);

  // Step 4: Verify soft deletion timestamp is set
  TestValidator.predicate(
    "post should have deletion timestamp after soft deletion",
    deletedPost.deleted_at !== undefined && deletedPost.deleted_at !== null,
  );

  // Step 5: Validate post ID matches
  TestValidator.equals(
    "deleted post ID should match created post ID",
    deletedPost.id,
    createdPost.id,
  );

  // Step 6: Validate post content remains intact (soft deletion preserves data)
  TestValidator.equals(
    "post title should remain unchanged after deletion",
    deletedPost.title,
    createdPost.title,
  );

  TestValidator.equals(
    "post type should remain unchanged after deletion",
    deletedPost.post_type,
    createdPost.post_type,
  );

  TestValidator.equals(
    "post status should remain unchanged after deletion",
    deletedPost.status,
    createdPost.status,
  );

  TestValidator.equals(
    "post community ID should remain unchanged after deletion",
    deletedPost.community_platform_community_id,
    createdPost.community_platform_community_id,
  );

  // Step 7: Test error scenario - try to delete non-existent post
  await TestValidator.error(
    "should fail when deleting non-existent post",
    async () => {
      await api.functional.communityPlatform.member.posts.erase(connection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
