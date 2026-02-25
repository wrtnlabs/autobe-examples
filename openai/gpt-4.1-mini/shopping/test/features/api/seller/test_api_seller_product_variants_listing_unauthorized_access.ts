import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_seller_product_variants_listing_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Accessing product variants as an unauthorized seller who does not own the product.
  // 1. Create two sellers and authenticate them.
  // 2. Each seller creates their own product.
  // 3. The second seller attempts to access the product variants of the first seller's product.
  // 4. Verify that access is denied (expect HttpError 403 or 401) and no variant data is returned.
  // 1. Seller A - Create and authenticate
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, { body: {} });
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerA.token.access}`,
  };
  // 2. Seller B - Create and authenticate
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, { body: {} });
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerB.token.access}`,
  };
  // 3. Seller A creates a product
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    { body: {} },
  );
  typia.assert(productA);
  // 4. Seller B attempts to access variants of Seller A's product
  // Prepare a request body for variant listing search criteria with empty filter and pagination
  const variantSearchBody: IShoppingMallProductVariant.IRequest = {
    page: 1,
    limit: 10,
  };
  // Expect an HTTP error due to unauthorized access
  await TestValidator.httpError(
    "unauthorized seller cannot access another seller's product variants",
    403, // or possibly 401 depending on backend design
    async () => {
      await api.functional.shoppingMall.seller.products.variants.index(
        sellerBConnection,
        {
          productId: productA.id,
          body: variantSearchBody,
        },
      );
    },
  );
}
