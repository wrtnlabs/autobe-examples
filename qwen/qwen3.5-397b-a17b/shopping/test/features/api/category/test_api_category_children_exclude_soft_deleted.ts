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
 * Test that soft-deleted subcategories are excluded from the children list.
 *
 * An administrator creates a parent category and multiple subcategories under it, then soft-deletes one of the subcategories. The test verifies that calling GET /shoppingMall/categories/{categoryId}/children returns only the active (non-deleted) subcategories, confirming that soft-deleted categories are properly filtered out from the results as per business rules.
 *
 * 1. Administrator account is created and authenticated using authorize_admin_join utility.
 * 2. A top-level parent category is created using generate_random_shopping_mall_admin_categories_create.
 * 3. First subcategory (active) is created under the parent category.
 * 4. Second subcategory (to be deleted) is created under the same parent category.
 * 5. Second subcategory is soft-deleted using api.functional.shoppingMall.admin.categories.erase.
 * 6. GET /shoppingMall/categories/{categoryId}/children is called to retrieve children of parent.
 * 7. Validation confirms the response contains valid category data and the soft-deleted category is not accessible.
 */
export async function test_api_category_children_exclude_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      grade: "regular",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create top-level parent category
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  // 3. Create first subcategory (will remain active)
  const activeSubcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(activeSubcategory);
  // 4. Create second subcategory (will be soft-deleted)
  const toDeleteSubcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(toDeleteSubcategory);
  // 5. Soft-delete the second subcategory
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: toDeleteSubcategory.id,
  });
  // 6. Get children list of parent category
  // Note: The iterate endpoint returns IShoppingMallCategory.ISummary type
  // The pagination protocol handles multiple items through the iteration mechanism
  const childResult =
    await api.functional.shoppingMall.categories.children.iterate(
      adminConnection,
      {
        categoryId: parentCategory.id,
      },
    );
  typia.assert(childResult);
  // 7. Validate the response structure and business logic
  // Verify the returned child is a valid category summary
  TestValidator.predicate(
    "child has valid id format",
    () => typeof childResult.id === "string" && childResult.id.length > 0,
  );
  TestValidator.predicate(
    "child has name",
    () => typeof childResult.name === "string" && childResult.name.length > 0,
  );
  // Verify the parent reference is correct
  TestValidator.predicate(
    "child references correct parent",
    () =>
      childResult.parent !== null &&
      childResult.parent.id === parentCategory.id,
  );
  // Verify the returned child is the active subcategory (not the deleted one)
  // Since the iterate endpoint returns items through pagination, we validate
  // that we can access the active subcategory and the deleted one is not returned
  TestValidator.equals(
    "returned child is active subcategory",
    childResult.id,
    activeSubcategory.id,
  );
  // Verify the deleted subcategory is not the one returned
  TestValidator.notEquals(
    "deleted subcategory not returned",
    childResult.id,
    toDeleteSubcategory.id,
  );
}
