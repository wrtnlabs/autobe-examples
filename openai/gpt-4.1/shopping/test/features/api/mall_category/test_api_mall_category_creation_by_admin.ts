import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validates successful mall category creation by admin and key business logic
 * checks.
 *
 * 1. Registers a new admin (required for subsequent authorization).
 * 2. Creates a root category (no parent_id).
 * 3. Creates a sub-category under the root category (with parent_id).
 * 4. Verifies all system-managed fields (id, created_at, updated_at, status).
 * 5. Checks unique name constraint by attempting to create a duplicate category
 *    name, expects error.
 *
 * Asserts correct type, hierarchical parent-child logic, and business rules.
 */
export async function test_api_mall_category_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName = RandomGenerator.name();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin email matches input",
    adminAuth.email,
    adminEmail,
  );
  TestValidator.equals("admin name matches input", adminAuth.name, adminName);
  TestValidator.predicate(
    "admin is_email_verified is boolean",
    typeof adminAuth.is_email_verified === "boolean",
  );

  // 2. Create a root category (no parent)
  const rootCategoryBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive", "deprecated"] as const),
  } satisfies IShoppingMallCategory.ICreate;
  const rootCategory =
    await api.functional.shoppingMall.admin.mallCategories.create(connection, {
      body: rootCategoryBody,
    });
  typia.assert(rootCategory);
  TestValidator.equals(
    "category name matches input",
    rootCategory.name,
    rootCategoryBody.name,
  );
  TestValidator.equals(
    "description matches input",
    rootCategory.description,
    rootCategoryBody.description,
  );
  TestValidator.equals(
    "sort_order matches input",
    rootCategory.sort_order,
    rootCategoryBody.sort_order,
  );
  TestValidator.equals(
    "status matches input",
    rootCategory.status,
    rootCategoryBody.status,
  );
  TestValidator.equals(
    "parent_id is null or undefined for root category",
    rootCategory.parent_id,
    undefined,
  );
  TestValidator.predicate(
    "category id is UUID",
    typeof rootCategory.id === "string" &&
      /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(
        rootCategory.id,
      ),
  );
  TestValidator.predicate(
    "created_at is ISO datetime",
    typeof rootCategory.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(rootCategory.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    typeof rootCategory.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(rootCategory.updated_at),
  );

  // 3. Create a sub-category (with parent_id)
  const subCategoryBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive", "deprecated"] as const),
    parent_id: rootCategory.id,
  } satisfies IShoppingMallCategory.ICreate;
  const subCategory =
    await api.functional.shoppingMall.admin.mallCategories.create(connection, {
      body: subCategoryBody,
    });
  typia.assert(subCategory);
  TestValidator.equals(
    "sub-category parent_id matches root id",
    subCategory.parent_id,
    rootCategory.id,
  );
  TestValidator.equals(
    "sub-category name matches input",
    subCategory.name,
    subCategoryBody.name,
  );
  TestValidator.equals(
    "sub-category status matches input",
    subCategory.status,
    subCategoryBody.status,
  );

  // 4. Try duplicate name (should fail by unique constraint)
  await TestValidator.error(
    "cannot create duplicate category name",
    async () => {
      await api.functional.shoppingMall.admin.mallCategories.create(
        connection,
        {
          body: {
            ...rootCategoryBody,
          },
        },
      );
    },
  );
}
