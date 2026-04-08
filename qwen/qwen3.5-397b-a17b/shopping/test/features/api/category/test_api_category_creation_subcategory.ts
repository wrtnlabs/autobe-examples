import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test successful creation of a subcategory under an existing top-level category.
 *
 * Validates the complete subcategory creation workflow including administrator authentication, top-level category creation, and subcategory establishment with proper parent reference. Ensures that the hierarchical relationship is correctly maintained with one-level nesting.
 *
 * Special attention is given to verifying that the subcategory's parent reference correctly points to the top-level category, and that the top-level category itself has no parent (null parent field).
 *
 * 1. Administrator authenticates using join workflow to gain category management permissions.
 * 2. Creates a top-level parent category with unique name and no parentId.
 * 3. Creates a subcategory by providing the parent category's ID in the parentId field.
 * 4. Validates that the subcategory's parent reference matches the created top-level category.
 * 5. Verifies the parent category's parent is null, confirming it's a top-level category.
 * 6. Ensures one-level nesting is properly established with correct hierarchical relationship.
 */
export async function test_api_category_creation_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create top-level parent category (no parentId)
  const parentCategory: IShoppingMallCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parentId: null,
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory with parentId referencing the top-level category
  const subcategory: IShoppingMallCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Validate subcategory's parent reference matches the created top-level category
  TestValidator.equals(
    "subcategory parent ID matches top-level category ID",
    subcategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory parent name matches top-level category name",
    subcategory.parent?.name,
    parentCategory.name,
  );
  // 5. Verify parent category's parent is null (top-level category)
  TestValidator.predicate(
    "parent category has no parent (is top-level)",
    parentCategory.parent === null,
  );
  // 6. Validate subcategory structure
  TestValidator.predicate(
    "subcategory has valid parent reference",
    subcategory.parent !== null,
  );
}
