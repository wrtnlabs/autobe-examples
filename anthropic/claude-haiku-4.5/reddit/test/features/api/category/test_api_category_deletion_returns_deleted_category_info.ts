import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_deletion_returns_deleted_category_info(
  connection: api.IConnection,
) {
  // Step 1: Administrator joins and authenticates
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a new category
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
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
    "created category has valid id",
    typeof createdCategory.id,
    "string",
  );

  // Step 3: Delete the category
  const deletedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.erase(
      connection,
      {
        categoryId: createdCategory.id,
      },
    );
  typia.assert(deletedCategory);

  // Step 4: Validate deletion response contains all category fields
  TestValidator.equals(
    "deleted category id matches created category",
    deletedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "deleted category name matches created",
    deletedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "deleted category slug matches created",
    deletedCategory.slug,
    createdCategory.slug,
  );
  TestValidator.equals(
    "deleted category has description",
    deletedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "deleted category has icon_url",
    deletedCategory.icon_url,
    createdCategory.icon_url,
  );
  TestValidator.equals(
    "deleted category has display_order",
    deletedCategory.display_order,
    createdCategory.display_order,
  );
  TestValidator.equals(
    "deleted category is_active status",
    deletedCategory.is_active,
    createdCategory.is_active,
  );

  // Verify timestamps exist
  TestValidator.predicate(
    "deleted category has created_at timestamp",
    deletedCategory.created_at !== null &&
      deletedCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "deleted category has updated_at timestamp",
    deletedCategory.updated_at !== null &&
      deletedCategory.updated_at !== undefined,
  );

  // Step 5: Verify response structure matches ICommunityPlatformCategory type
  TestValidator.predicate(
    "deleted category response is valid type",
    typeof deletedCategory.id === "string",
  );
  TestValidator.predicate(
    "deleted category name is string",
    typeof deletedCategory.name === "string",
  );
  TestValidator.predicate(
    "deleted category slug is string",
    typeof deletedCategory.slug === "string",
  );
  TestValidator.predicate(
    "deleted category display_order is number",
    typeof deletedCategory.display_order === "number",
  );
  TestValidator.predicate(
    "deleted category is_active is boolean",
    typeof deletedCategory.is_active === "boolean",
  );
}
