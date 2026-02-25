import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_seller_inventory_histories_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Verify that querying inventory histories with filters that match no records returns an empty paginated response
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, { body: {} });
  // Set auth token in connection headers
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create product for seller with random data
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(product);
  // 3. Add product variant to created product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      { params: { productId: product.id }, body: undefined },
    );
  typia.assert(variant);
  // 4. Prepare search request with filters that won't match any inventory history
  const startDate = new Date().toISOString();
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 1 day ahead
  const requestBody: IShoppingMallInventoryHistory.IRequest = {
    shoppingMallProductVariantId: variant.id,
    startDate: futureDate, // future date - no records
    endDate: futureDate,
    reason: "non-existent reason",
    page: 1,
    limit: 10,
  };
  // 5. Query inventory histories with the filter
  const response =
    await api.functional.shoppingMall.seller.inventory.histories.index(
      sellerConnection,
      { body: requestBody },
    );
  // Assert response type
  typia.assert(response);
  // 6. Validate that the data list is empty
  TestValidator.equals("empty data list", response.data.length, 0);
  // 7. Validate that pagination fields are valid
  TestValidator.predicate(
    "pagination current positive",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records zero",
    response.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages zero",
    response.pagination.pages === 0,
  );
}
