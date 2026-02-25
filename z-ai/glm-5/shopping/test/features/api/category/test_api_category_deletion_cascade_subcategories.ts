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
 * Test cascade deletion of subcategories when parent category is deleted.
 * Steps:
 * 1. Admin authenticates and creates a parent category (top-level)
 * 2. Admin creates a subcategory linked to the parent
 * 3. Admin deletes the parent category
 * 4. Verify both parent and child are soft-deleted (cannot delete again)
 */
export async function test_api_category_deletion_cascade_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent category (top-level, no parent)
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      { body: { parentId: null } },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory linked to the parent
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      { body: { parentId: parentCategory.id } },
    );
  typia.assert(subcategory);
  // Verify subcategory is linked to parent
  TestValidator.predicate(
    "subcategory has parent reference",
    () => subcategory.parent !== null,
  );
  TestValidator.equals(
    "subcategory parent id matches",
    subcategory.parent?.id,
    parentCategory.id,
  );
  // 4. Delete parent category (cascade should soft-delete subcategory)
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: parentCategory.id,
  });
  // 5. Verify parent category is soft-deleted (cannot delete again)
  await TestValidator.error(
    "parent category already soft-deleted",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(
        adminConnection,
        {
          categoryId: parentCategory.id,
        },
      );
    },
  );
  // 6. Verify subcategory is also soft-deleted via cascade (cannot delete again)
  await TestValidator.error(
    "subcategory cascade soft-deleted with parent",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(
        adminConnection,
        {
          categoryId: subcategory.id,
        },
      );
    },
  );
}
