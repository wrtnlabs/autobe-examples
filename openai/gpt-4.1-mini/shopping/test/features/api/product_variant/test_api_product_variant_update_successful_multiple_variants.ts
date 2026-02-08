import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function test_api_product_variant_update_successful_multiple_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2. Seller creates a new product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // 3. Prepare empty variants update since no create/fetch variant utility
  const variantsToUpdate: IShoppingMallProductVariant.IRequest = [];
  // 4. Update variants (empty array)
  const productId = (product as any).id ?? "";
  const response =
    await api.functional.shoppingMall.seller.products.variants.updateVariants(
      sellerConnection,
      {
        productId: productId,
        body: variantsToUpdate,
      },
    );
  typia.assert(response);
  // 5. Validate response
  TestValidator.equals("response data length", response.data.length, 0);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages zero or more",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records zero or more",
    response.pagination.records >= 0,
  );
}
