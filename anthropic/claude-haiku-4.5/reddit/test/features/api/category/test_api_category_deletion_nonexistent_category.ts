import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test deletion attempt on non-existent category.
 *
 * This test validates that the API properly handles deletion requests for
 * categories that do not exist. The operation attempts to delete a category
 * using a randomly generated UUID that does not correspond to any actual
 * category in the system. The system should respond with an appropriate error
 * indicating the category does not exist, rather than throwing unexpected
 * errors.
 *
 * Steps:
 *
 * 1. Authenticate as administrator to gain deletion permissions
 * 2. Generate a non-existent category UUID
 * 3. Attempt deletion of the non-existent category
 * 4. Verify the operation fails with proper error handling
 */
export async function test_api_category_deletion_nonexistent_category(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate a non-existent category UUID
  const nonexistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt deletion of the non-existent category and verify error handling
  await TestValidator.error(
    "deleting non-existent category should fail",
    async () => {
      await api.functional.communityPlatform.administrator.categories.erase(
        connection,
        {
          categoryId: nonexistentCategoryId,
        },
      );
    },
  );
}
