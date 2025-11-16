import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test update attempt on non-existent category using invalid or randomly
 * generated UUID.
 *
 * This test validates that attempting to update a category that does not exist
 * in the system fails with an appropriate error response. The system should
 * handle non-existent resource requests gracefully and return meaningful error
 * information without attempting invalid database operations.
 *
 * Test flow:
 *
 * 1. Administrator authenticates to the system
 * 2. Attempt to update a category with a randomly generated UUID that doesn't
 *    exist
 * 3. Verify the operation fails with an appropriate error
 * 4. Validate that the error response is meaningful and indicates the resource not
 *    found
 */
export async function test_api_category_update_nonexistent_category(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt to update non-existent category with random UUID
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "updating non-existent category should fail",
    async () => {
      await api.functional.communityPlatform.administrator.categories.update(
        connection,
        {
          categoryId: nonExistentCategoryId,
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            slug: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            is_active: true,
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );
}
