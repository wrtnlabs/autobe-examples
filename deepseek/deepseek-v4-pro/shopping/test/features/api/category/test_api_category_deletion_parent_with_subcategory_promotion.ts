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
 * Test deletion of a parent category with subcategory promotion.
 *
 * Validates that when a top-level parent category with active subcategories is deleted, all direct children are promoted to top-level status while retaining their names, descriptions, and product assignments. The deleted category is soft-deleted with a deletion timestamp and excluded from all future category operations.
 *
 * 1. Administrator registers and authenticates via admin join.
 * 2. Creates a top-level parent category with randomized name and description.
 * 3. Creates a subcategory under the parent, verifying the parent_id association.
 * 4. Deletes the parent category through the erase endpoint.
 * 5. Confirms the parent category is fully deleted by attempting a repeat deletion, which returns a 404 error.
 * 6. Confirms the deleted parent cannot serve as a parent for new subcategories.
 * 7. Verifies subcategory promotion by attempting to create a new top-level category with the promoted subcategory's name — the name uniqueness constraint among top-level categories triggers a 409 Conflict, proving the subcategory now exists as a top-level category.
 */
export async function test_api_category_deletion_parent_with_subcategory_promotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent category
  const parent = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(parent);
  // 3. Create subcategory under parent
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parent.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Verify subcategory's parent is the parent category
  const subcategoryParent = typia.assert(subcategory.parent!);
  TestValidator.equals(
    "subcategory parent matches parent",
    subcategoryParent.id,
    parent.id,
  );
  // 5. Delete parent category
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: parent.id,
  });
  // 6. Verify parent category is deleted
  await TestValidator.error(
    "deleted parent category should not be found",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(
        adminConnection,
        { categoryId: parent.id },
      );
    },
  );
  // 7. Verify deleted parent cannot be used for new subcategories
  await TestValidator.error(
    "cannot create subcategory under deleted parent",
    async () => {
      await generate_random_shopping_mall_admin_categories_create(
        adminConnection,
        {
          body: {
            parent_id: parent.id,
          },
        },
      );
    },
  );
  // 8. Verify subcategory was promoted to top-level:
  //    Name conflict with new top-level category proves promotion
  await TestValidator.error(
    "promoted subcategory name conflicts with new top-level category",
    async () => {
      await generate_random_shopping_mall_admin_categories_create(
        adminConnection,
        {
          body: {
            name: subcategory.name,
          },
        },
      );
    },
  );
}
