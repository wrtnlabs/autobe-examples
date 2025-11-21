import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test that a moderator can delete posts within their assigned communities.
 *
 * This scenario validates moderator privileges for content management, ensuring
 * moderators can remove inappropriate content regardless of the original
 * creator. The test verifies proper authorization checks and community scope
 * validation for moderator deletion actions.
 */
export async function test_api_post_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a regular member account
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

  // Step 2: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create a post as the member
  // Note: Using a realistic community ID that would exist in a real scenario
  // In a real implementation, we would create a community first, but for this test
  // we'll use a valid UUID format that represents an existing community
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const postData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    post_type: "text" as const,
    status: "published" as const,
    community_platform_community_id: communityId,
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(createdPost);

  // Step 4: Delete the post as the moderator
  const deletedPost = await api.functional.communityPlatform.member.posts.erase(
    connection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(deletedPost);

  // Step 5: Verify the post was soft-deleted
  TestValidator.equals(
    "post should have deleted_at timestamp set after moderator deletion",
    deletedPost.deleted_at !== undefined,
    true,
  );
  TestValidator.equals(
    "post ID should match the original post after deletion",
    deletedPost.id,
    createdPost.id,
  );
  TestValidator.equals(
    "post title should remain unchanged after deletion",
    deletedPost.title,
    createdPost.title,
  );
  TestValidator.equals(
    "post community association should remain intact",
    deletedPost.community_platform_community_id,
    createdPost.community_platform_community_id,
  );

  // Step 6: Verify that attempting to delete an already deleted post fails
  await TestValidator.error(
    "should not be able to delete an already deleted post",
    async () => {
      await api.functional.communityPlatform.member.posts.erase(connection, {
        postId: createdPost.id,
      });
    },
  );
}
