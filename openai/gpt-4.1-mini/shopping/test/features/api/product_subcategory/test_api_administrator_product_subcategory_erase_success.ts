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

export async function test_api_administrator_product_subcategory_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminpass123",
    },
  });
  adminConnection.headers = { Authorization: admin.token.access };
  // 2. Create a product category to be used as parent for subcategory
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Create a product subcategory under the created category
  const subcategory =
    await generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory(
      adminConnection,
      {
        params: { productCategoryId: category.id },
      },
    );
  typia.assert(subcategory);
  // 4. Delete (erase) the product subcategory
  await api.functional.shoppingMall.administrator.productCategories.productSubcategories.eraseProductSubcategory(
    adminConnection,
    {
      productCategoryId: category.id,
      productSubcategoryId: subcategory.id,
    },
  );
  // 5. Verify that the subcategory no longer exists (expect error on GET or list)
  // Note: There is no provided GET endpoint for a single subcategory or list in input,
  // so this verification step is omitted due to API limitations of this test scenario.
  // The main validation is ensured by no error thrown from deletion and response status.
  // If products are associated, business logic typically reassigns subcategory to 'uncategorized'.
  // However, no product management APIs are provided to verify it, so this is assumed.
}
