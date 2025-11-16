import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test deletion of non-existent community returns appropriate error.
 *
 * This test validates that attempting to delete a community with an invalid or
 * non-existent communityId properly returns an HTTP 404 error response,
 * indicating that the requested community was not found. The test ensures the
 * API correctly handles deletion requests for communities that do not exist,
 * maintaining proper error handling and data integrity.
 *
 * Test flow:
 *
 * 1. Create an authenticated member account via join endpoint
 * 2. Generate a random valid UUID for a non-existent community
 * 3. Attempt to delete the non-existent community
 * 4. Verify the operation throws an HTTP 404 error
 * 5. Confirm error indicates community not found
 */
export async function test_api_community_deletion_of_nonexistent_community(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member for deletion attempt
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Generate a random UUID for a non-existent community
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to delete non-existent community and verify error
  await TestValidator.error(
    "deletion of non-existent community should return 404 error",
    async () => {
      await api.functional.communityPlatform.member.communities.erase(
        connection,
        {
          communityId: nonExistentCommunityId,
        },
      );
    },
  );
}
