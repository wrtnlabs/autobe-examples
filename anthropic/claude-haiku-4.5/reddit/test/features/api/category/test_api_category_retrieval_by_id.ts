import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful retrieval of a category by its UUID identifier.
 *
 * The test validates the complete category retrieval workflow:
 *
 * 1. Administrator account creation and authentication
 * 2. Category creation with all metadata (name, slug, description, icon URL,
 *    display order)
 * 3. Category retrieval by ID
 * 4. Validation that retrieved category matches all originally provided data
 *
 * This test ensures the category retrieval endpoint correctly returns all
 * category properties including system-generated fields (id, created_at,
 * updated_at) and properly validates data consistency between creation and
 * retrieval operations.
 */
export async function test_api_category_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator account created successfully",
    administrator.id !== null && administrator.email !== null,
  );

  // Step 2: Create a test category with specific metadata
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug =
    RandomGenerator.alphabets(5) + "-" + RandomGenerator.alphabets(5);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const categoryIconUrl = typia.random<string & tags.Format<"uri">>();
  const categoryDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          icon_url: categoryIconUrl,
          display_order: categoryDisplayOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  TestValidator.predicate(
    "category created with valid ID",
    createdCategory.id !== null,
  );

  // Step 3: Retrieve the category using its ID
  const retrievedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.at(connection, {
      categoryId: createdCategory.id,
    });
  typia.assert(retrievedCategory);

  // Step 4: Validate that retrieved category matches created category data
  TestValidator.equals(
    "retrieved category ID matches created category",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "retrieved category name matches created data",
    retrievedCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "retrieved category slug matches created data",
    retrievedCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "retrieved category description matches created data",
    retrievedCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "retrieved category icon URL matches created data",
    retrievedCategory.icon_url,
    categoryIconUrl,
  );
  TestValidator.equals(
    "retrieved category display order matches created data",
    retrievedCategory.display_order,
    categoryDisplayOrder,
  );
  TestValidator.predicate(
    "retrieved category is active",
    retrievedCategory.is_active === true,
  );
  TestValidator.predicate(
    "retrieved category has created_at timestamp",
    retrievedCategory.created_at !== null,
  );
  TestValidator.predicate(
    "retrieved category has updated_at timestamp",
    retrievedCategory.updated_at !== null,
  );
}
