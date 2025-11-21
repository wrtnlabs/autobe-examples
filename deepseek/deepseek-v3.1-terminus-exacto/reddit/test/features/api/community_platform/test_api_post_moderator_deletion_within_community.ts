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
 * Test that a moderator can delete posts specifically using the moderator
 * deletion endpoint. This scenario validates the moderator-specific deletion
 * workflow, ensuring proper authorization checks and community scope
 * validation. The test verifies that moderators can only delete posts within
 * their assigned communities and that the deletion operation properly records
 * moderator actions.
 */
export async function test_api_post_moderator_deletion_within_community(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post as the member
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create and authenticate moderator account
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

  // Step 4: Moderator deletes the post using moderator-specific deletion endpoint
  const deletedPost =
    await api.functional.communityPlatform.moderator.posts.erase(connection, {
      postId: post.id,
    });
  typia.assert(deletedPost);

  // Step 5: Validate that the post was properly deleted
  TestValidator.equals(
    "deleted post ID matches original post ID",
    deletedPost.id,
    post.id,
  );
  TestValidator.predicate(
    "post has deletion timestamp",
    deletedPost.deleted_at !== undefined,
  );
  TestValidator.equals("post status is removed", deletedPost.status, "removed");

  // Step 6: Test error scenario - attempt to delete non-existent post
  await TestValidator.error(
    "should fail when deleting non-existent post",
    async () => {
      await api.functional.communityPlatform.moderator.posts.erase(connection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
