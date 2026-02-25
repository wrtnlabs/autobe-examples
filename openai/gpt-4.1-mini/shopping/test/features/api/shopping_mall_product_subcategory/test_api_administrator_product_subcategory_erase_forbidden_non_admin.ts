import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_create";
import { generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";
import { prepare_random_shopping_mall_product_subcategory } from "../../../prepare/prepare_random_shopping_mall_product_subcategory";

/**
 * Test forbidden deletion attempt by a non-administrator actor, ensuring access control rules are enforced.
 * Only administrators are allowed to delete product subcategories.
 *
 * The test creates a product category and subcategory, but attempts deletion
 * using a non-administrator connection, expecting HTTP 403 Forbidden error.
 *
 * This scenario validates strict access control for the delete operation.
 */
export async function test_api_administrator_product_subcategory_erase_forbidden_non_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login to set up admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(connection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create product category by administrator
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      { body: undefined },
    );
  typia.assert(category);
  // 3. Create product subcategory by administrator
  const subcategory =
    await generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory(
      adminConnection,
      { params: { productCategoryId: category.id }, body: undefined },
    );
  typia.assert(subcategory);
  // 4. Create a non-admin connection (simulate a customer user)
  const nonAdminConnection: api.IConnection = { host: connection.host };
  // Do not authorize this connection as administrator, simulate no auth or other
  // For test, we do not set Authorization header to simulate unauthorized user
  // 5. Attempt to delete the product subcategory by non-admin
  await TestValidator.httpError(
    "forbidden product subcategory deletion by non-admin",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.eraseProductSubcategory(
        nonAdminConnection,
        {
          productCategoryId: category.id,
          productSubcategoryId: subcategory.id,
        },
      );
    },
  );
}
