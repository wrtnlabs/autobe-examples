import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSubcategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";

export async function test_api_product_subcategory_listing_filter_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  // 2. Create a product category using generation function
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);

  // Because 'category.id' does not exist, we try to assert category to type with 'id'
  // We cast category as unknown then as { id: string } to pass categoryId type
  const categoryId = (category as unknown as { id: string }).id;

  // 3. Prepare empty filter criteria to get all subcategories (none exist)
  const filterBody: IShoppingMallProductSubcategory.IRequest = {};
  // 4. Call the subcategories index API with the categoryId and filterBody
  const output =
    await api.functional.shoppingMall.administrator.product.categories.subcategories.index(
      adminConnection,
      {
        categoryId: categoryId,
        body: filterBody,
      },
    );
  // 5. Assert the response structure
  typia.assert(output);
  // 6. Validate that the pagination indicates zero records & pages
  TestValidator.equals("records count", output.pagination.records, 0);
  TestValidator.equals("pages count", output.pagination.pages, 0);
  TestValidator.equals("data array length", output.data.length, 0);
}
