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
 * Test clean soft-deletion of a leaf depth-1 subcategory with no children.
 *
 * Validates that deleting a subcategory that has no subcategories of its own
 * (a leaf node) completes without errors and without requiring any hierarchy
 * reorganization. Since there are no children to promote, the deletion is a
 * straightforward soft-delete operation.
 *
 * The test also confirms the soft-deletion is effective by attempting a
 * duplicate deletion, which must return a 404 Not Found response. The parent
 * category and any sibling subcategories remain unaffected.
 *
 * 1. Administrator authenticates via join.
 * 2. Creates a top-level parent category.
 * 3. Creates a depth-1 subcategory under the parent as a leaf node.
 * 4. Validates the subcategory's parent reference and empty children.
 * 5. Deletes the subcategory — expects success with no errors.
 * 6. Re-deletes the subcategory — expects 404 to confirm soft-deletion.
 */
export async function test_api_category_deletion_leaf_subcategory_clean_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a top-level parent category
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  // 3. Create a depth-1 subcategory under the parent (leaf node)
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // Verify correct hierarchy placement
  TestValidator.equals(
    "subcategory parent",
    subcategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals("leaf has no children", subcategory.children.length, 0);
  // 4. Delete the leaf subcategory
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: subcategory.id,
  });
  // 5. Confirm soft-deletion — re-deletion yields 404
  await TestValidator.httpError("double delete returns 404", 404, async () => {
    await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
      categoryId: subcategory.id,
    });
  });
}
