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
 * Test that category name uniqueness is enforced among sibling categories.
 *
 * This test validates the business rule that category names must be unique
 * within the same parent category (sibling uniqueness). When an administrator
 * attempts to update a category name to match an existing sibling's name,
 * the system must reject the update with a 409 Conflict error.
 *
 * Test Flow:
 * 1. Authenticate as administrator
 * 2. Create parent category (top-level)
 * 3. Create first subcategory under parent
 * 4. Create second subcategory under same parent (sibling)
 * 5. Attempt to update second subcategory's name to match first subcategory
 * 6. Verify system returns 409 Conflict error
 */
export async function test_api_category_update_sibling_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent category (top-level)
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: "Parent category for testing sibling uniqueness",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create first subcategory under parent
  const firstSubcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: "First subcategory under parent",
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(firstSubcategory);
  // 4. Create second subcategory under same parent (sibling to first)
  const secondSubcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: "Second subcategory under parent",
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(secondSubcategory);
  // 5. Attempt to update second subcategory's name to match first subcategory
  // This should fail with 409 Conflict due to @@unique([parent_id, name]) constraint
  await TestValidator.httpError(
    "should reject duplicate sibling name",
    409,
    async () => {
      await api.functional.shoppingMall.admin.categories.update(
        adminConnection,
        {
          categoryId: secondSubcategory.id,
          body: {
            name: firstSubcategory.name,
          } satisfies IShoppingMallCategory.IUpdate,
        },
      );
    },
  );
}
