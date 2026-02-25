import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
 * Test that category names can be reused across different parent categories,
 * validating the sibling-level uniqueness constraint.
 *
 * Steps:
 * 1. Administrator authenticates via join endpoint
 * 2. Administrator creates two different top-level parent categories
 *    (e.g., 'Electronics' and 'Clothing')
 * 3. Administrator creates a subcategory named 'Accessories' under the first parent
 * 4. Administrator creates another subcategory also named 'Accessories' under the second parent
 * 5. Verify both subcategories are created successfully with the same name but different parent IDs
 * 6. Verify each subcategory appears in the correct parent's children array
 *
 * Business validations:
 * - Category name uniqueness is enforced only among siblings (same parent)
 * - Same category name can exist under different parents without conflict
 * - Each category has unique ID and correct parent reference
 */
export async function test_api_category_creation_sibling_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create two different top-level parent categories
  const parentCategory1 =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Electronics",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory1);
  const parentCategory2 =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Clothing",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory2);
  // 3. Create subcategory named 'Accessories' under the first parent
  const subcategory1 =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Accessories",
        parentId: parentCategory1.id,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(subcategory1);
  // 4. Create another subcategory also named 'Accessories' under the second parent
  const subcategory2 =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Accessories",
        parentId: parentCategory2.id,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(subcategory2);
  // 5. Verify both subcategories are created successfully with the same name
  // but different parent IDs
  TestValidator.equals(
    "subcategory names match",
    subcategory1.name,
    "Accessories",
  );
  TestValidator.equals(
    "subcategory names match",
    subcategory2.name,
    "Accessories",
  );
  TestValidator.notEquals(
    "subcategory IDs differ",
    subcategory1.id,
    subcategory2.id,
  );
  TestValidator.equals(
    "subcategory1 parent",
    subcategory1.parent?.id,
    parentCategory1.id,
  );
  TestValidator.equals(
    "subcategory2 parent",
    subcategory2.parent?.id,
    parentCategory2.id,
  );
  // 6. Verify each subcategory appears in the correct parent's children array
  TestValidator.predicate(
    "subcategory1 in parent1 children",
    parentCategory1.children.some((child) => child.id === subcategory1.id),
  );
  TestValidator.predicate(
    "subcategory2 in parent2 children",
    parentCategory2.children.some((child) => child.id === subcategory2.id),
  );
}
