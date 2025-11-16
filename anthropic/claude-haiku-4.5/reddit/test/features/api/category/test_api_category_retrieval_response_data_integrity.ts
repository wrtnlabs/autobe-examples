import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_retrieval_response_data_integrity(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "SecurePassword123!",
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a test category with specific values
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphabets(8).toLowerCase();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });
  const categoryIconUrl = typia.random<string & tags.Format<"uri">>();
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createCategoryData = {
    name: categoryName,
    slug: categorySlug,
    description: categoryDescription,
    icon_url: categoryIconUrl,
    display_order: displayOrder,
  } satisfies ICommunityPlatformCategory.ICreate;

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: createCategoryData,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Retrieve the category by ID
  const retrievedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.at(connection, {
      categoryId: createdCategory.id,
    });
  typia.assert(retrievedCategory);

  // Step 4: Verify field-by-field that data integrity is maintained
  TestValidator.equals(
    "category ID matches",
    createdCategory.id,
    retrievedCategory.id,
  );

  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    retrievedCategory.name,
  );

  TestValidator.equals(
    "category slug matches",
    createdCategory.slug,
    retrievedCategory.slug,
  );

  TestValidator.equals(
    "category description matches",
    createdCategory.description,
    retrievedCategory.description,
  );

  TestValidator.equals(
    "category icon_url matches",
    createdCategory.icon_url,
    retrievedCategory.icon_url,
  );

  TestValidator.equals(
    "category display_order matches",
    createdCategory.display_order,
    retrievedCategory.display_order,
  );

  TestValidator.equals(
    "category is_active status matches",
    createdCategory.is_active,
    retrievedCategory.is_active,
  );

  // Step 5: Verify timestamps are preserved
  TestValidator.equals(
    "category created_at timestamp matches",
    createdCategory.created_at,
    retrievedCategory.created_at,
  );

  TestValidator.equals(
    "category updated_at timestamp matches",
    createdCategory.updated_at,
    retrievedCategory.updated_at,
  );

  // Step 6: Confirm complete data integrity
  TestValidator.equals(
    "complete category data integrity",
    createdCategory,
    retrievedCategory,
  );
}
