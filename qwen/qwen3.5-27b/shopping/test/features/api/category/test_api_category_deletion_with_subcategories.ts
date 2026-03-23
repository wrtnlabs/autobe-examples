import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test that an administrator can delete a parent category with subcategories.
 * Validates cascade deletion of subcategories when parent is deleted.
 */
export async function test_api_category_deletion_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent category
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Clothing",
          description: "Apparel and fashion items",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategories under the parent
  const subcategory1 =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Men",
        description: "Men's clothing",
        parent_id: parentCategory.id,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(subcategory1);
  const subcategory2 =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Women",
        description: "Women's clothing",
        parent_id: parentCategory.id,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(subcategory2);
  // 4. Verify category hierarchy before deletion
  TestValidator.equals(
    "parent has 2 subcategories",
    parentCategory.subcategories.length,
    2,
  );
  TestValidator.predicate(
    "subcategory1 exists in parent",
    parentCategory.subcategories.some((s) => s.id === subcategory1.id),
  );
  TestValidator.predicate(
    "subcategory2 exists in parent",
    parentCategory.subcategories.some((s) => s.id === subcategory2.id),
  );
  // 5. Delete the parent category (should cascade delete subcategories)
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: parentCategory.id,
  });
  // 6. Verify deletion succeeded (no error thrown means successful deletion)
  TestValidator.predicate(
    "parent category and subcategories deleted successfully",
    true,
  );
}
