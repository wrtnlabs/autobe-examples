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
import { generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";
import { prepare_random_shopping_mall_product_subcategory } from "../../../prepare/prepare_random_shopping_mall_product_subcategory";

export async function test_api_product_subcategory_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and gets authenticated
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoined = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminJoined);
  adminConnection.headers = { Authorization: adminJoined.token.access };
  // 2. Administrator creates a product category
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Administrator creates a product subcategory under the created product category
  const subcategory =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { productCategoryId: category.id },
      },
    );
  typia.assert(subcategory);
  // 4. Administrator deletes the created subcategory
  await api.functional.shoppingMall.administrator.product_categories.subcategories.erase(
    adminConnection,
    {
      productCategoryId: category.id,
      subcategoryId: subcategory.id,
    },
  );
  // 5. Verification phase: Try to fetch the deleted subcategory or check behavior (not implemented due to no GET for subcategory)
  // Note: In the current provided SDK, there's no GET subcategory endpoint,
  // so we'll assume erase returned without error means success.
  // Future enhancement: add GET subcategory check and product reassignment check.
}
