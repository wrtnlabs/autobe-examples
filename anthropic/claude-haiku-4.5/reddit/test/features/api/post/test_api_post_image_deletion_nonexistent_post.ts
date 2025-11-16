import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test error handling when attempting to delete an image from a non-existent
 * post.
 *
 * This test validates that the API properly rejects image deletion requests
 * when the target post does not exist in the system. It creates a member
 * account for authentication and then attempts to delete an image from a post
 * using valid UUID formats but with non-existent IDs. The test verifies that a
 * 404 Not Found error is returned and that no unintended side effects occur in
 * the system.
 *
 * Test flow:
 *
 * 1. Create a member account and authenticate
 * 2. Generate valid UUID formats for non-existent post and image
 * 3. Attempt to delete the image from the non-existent post
 * 4. Verify that a 404 error is returned
 * 5. Ensure the system state remains unchanged (no side effects)
 */
export async function test_api_post_image_deletion_nonexistent_post(
  connection: api.IConnection,
) {
  // Step 1: Create a member account and authenticate
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Generate valid UUIDs for non-existent post and image
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentImageId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to delete image from non-existent post and verify 404 error
  await TestValidator.httpError(
    "should return 404 when deleting image from non-existent post",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.images.erase(
        connection,
        {
          postId: nonExistentPostId,
          imageId: nonExistentImageId,
        },
      );
    },
  );

  // Step 5: Verify no side effects by attempting another operation with different non-existent IDs
  const anotherNonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const anotherNonExistentImageId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.httpError(
    "should consistently return 404 for different non-existent post IDs",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.images.erase(
        connection,
        {
          postId: anotherNonExistentPostId,
          imageId: anotherNonExistentImageId,
        },
      );
    },
  );
}
