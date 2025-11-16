import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate that category retrieval is publicly accessible without
 * authentication.
 *
 * This test verifies that category information can be retrieved by any user,
 * including unauthenticated users, supporting community discovery workflows
 * where users need to browse available categories.
 *
 * Test process:
 *
 * 1. Create administrator account for setup operations
 * 2. Create a test category as administrator
 * 3. Create unauthenticated connection (no auth token)
 * 4. Retrieve category using unauthenticated connection
 * 5. Validate category data matches created category
 */
export async function test_api_category_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: undefined,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a test category as administrator
  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 3,
          }),
          slug: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Create unauthenticated connection (remove authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 4: Retrieve category using unauthenticated connection
  const retrievedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.at(unauthConn, {
      categoryId: createdCategory.id,
    });
  typia.assert(retrievedCategory);

  // Step 5: Validate category data matches created category
  TestValidator.equals(
    "retrieved category ID matches created category",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "retrieved category name matches created category",
    retrievedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "retrieved category slug matches created category",
    retrievedCategory.slug,
    createdCategory.slug,
  );
  TestValidator.equals(
    "retrieved category description matches created category",
    retrievedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "retrieved category display order matches created category",
    retrievedCategory.display_order,
    createdCategory.display_order,
  );
  TestValidator.predicate(
    "category is active after retrieval",
    retrievedCategory.is_active,
  );
}
