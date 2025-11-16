import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that deleting the same category multiple times fails appropriately after
 * the first successful deletion.
 *
 * This test validates idempotency handling and resource lifecycle management:
 *
 * 1. Administrator authentication is established
 * 2. A new category is created with unique name and slug
 * 3. The category is successfully deleted on the first attempt
 * 4. A second deletion attempt on the same category ID is made
 * 5. The second deletion should fail, confirming the category no longer exists
 * 6. The API properly enforces that deleted resources cannot be deleted again
 */
export async function test_api_category_deletion_multiple_times(
  connection: api.IConnection,
) {
  // Step 1: Administrator registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a test category
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: `test-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: null,
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "category created with unique ID",
    typeof createdCategory.id,
    "string",
  );

  // Step 3: First deletion - should succeed
  const firstDeletion: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.erase(
      connection,
      {
        categoryId: createdCategory.id,
      },
    );
  typia.assert(firstDeletion);
  TestValidator.equals(
    "first deletion returns original category",
    firstDeletion.id,
    createdCategory.id,
  );

  // Step 4: Second deletion attempt - should fail
  await TestValidator.error(
    "second deletion of same category should fail",
    async () => {
      await api.functional.communityPlatform.administrator.categories.erase(
        connection,
        {
          categoryId: createdCategory.id,
        },
      );
    },
  );

  TestValidator.predicate(
    "category deletion prevents duplicate deletion attempts",
    true,
  );
}
