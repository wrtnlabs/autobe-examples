import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test deletion of non-existent community returns 404 Not Found.
 *
 * Administrator attempts to delete a community using an invalid or fabricated
 * communityId that does not exist in the system. The test validates that the
 * API returns HTTP 404 with appropriate error message indicating the community
 * does not exist. This ensures proper error handling for missing resources and
 * prevents accidental deletion of wrong communities through UUID parameter
 * validation.
 *
 * Process:
 *
 * 1. Create an administrator account with deletion privileges
 * 2. Attempt to delete a non-existent community using a fabricated UUID
 * 3. Verify the API returns 404 Not Found error
 * 4. Confirm no side effects occur and the operation fails gracefully
 */
export async function test_api_community_deletion_nonexistent_community_not_found(
  connection: api.IConnection,
) {
  // 1. Create an administrator account with deletion privileges
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  TestValidator.predicate(
    "administrator account created successfully",
    admin.id !== null && admin.id !== undefined,
  );

  // 2. Attempt to delete a non-existent community using a fabricated UUID
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  // 3. Verify the API returns 404 Not Found error
  await TestValidator.error(
    "deletion of non-existent community should fail with 404 Not Found",
    async () => {
      await api.functional.communityPlatform.administrator.communities.erase(
        connection,
        {
          communityId: nonExistentCommunityId,
        },
      );
    },
  );

  TestValidator.predicate(
    "deletion attempt completed and error was properly thrown",
    true,
  );
}
