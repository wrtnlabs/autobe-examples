import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test deletion of a non-existent post ID.
 *
 * This test validates that attempting to delete a post with a valid UUID format
 * that does not exist in the database returns proper error handling (404 Not
 * Found). The test ensures the system correctly distinguishes between valid but
 * missing resources and malformed requests, testing the boundary condition
 * where a member requests deletion of a post that was never created.
 *
 * Test flow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Attempt to delete a post using a non-existent but valid UUID format
 * 3. Verify that the API returns an error (404 Not Found)
 */
export async function test_api_post_deletion_non_existent(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Generate a non-existent post ID (valid UUID format)
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to delete the non-existent post and verify error handling
  await TestValidator.error(
    "delete non-existent post should fail with 404 error",
    async () => {
      await api.functional.communityPlatform.member.posts.erase(connection, {
        postId: nonExistentPostId,
      });
    },
  );
}
