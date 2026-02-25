import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_product_variant_create_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and login to get authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, { body: {} });
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2. Create a product with the authenticated seller for variant association
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Attempt unauthorized creation of product variant without authentication
  await TestValidator.httpError(
    "unauthorized product variant creation should be rejected",
    401,
    async () => {
      const body = {
        skuCode: `sku_${RandomGenerator.alphabets(6)}`,
        priceOverride: typia.random<number | null>(),
        stockQuantity: (typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>()) satisfies number & tags.Type<"int32"> & tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies IShoppingMallProductVariant.ICreate;
      await api.functional.shoppingMall.seller.products.variants.createVariant(
        connection, // BASE connection without authentication
        {
          productId: product.id,
          body,
        },
      );
    },
  );
}
