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

export async function test_api_product_variant_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create a product by the authenticated seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Create a product variant linked to the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variant);
  // 4. Prepare update body with new skuCode, optional priceOverride, and stockQuantity
  const updateBody: IShoppingMallProductVariant.IUpdate = {
    skuCode: variant.skuCode + "_updated",
    priceOverride: (variant.priceOverride ?? 0) + 1000,
    stockQuantity: variant.stockQuantity + 10,
  };
  // 5. Call updateVariant API endpoint to update the variant
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.updateVariant(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVariant);
  // 6. Validate updated fields in response
  TestValidator.equals(
    "skuCode updated",
    updatedVariant.skuCode,
    updateBody.skuCode,
  );
  TestValidator.equals(
    "priceOverride updated",
    updatedVariant.priceOverride ?? 0,
    updateBody.priceOverride ?? 0,
  );
  TestValidator.equals(
    "stockQuantity updated",
    updatedVariant.stockQuantity,
    updateBody.stockQuantity,
  );
  TestValidator.equals(
    "productId remains unchanged",
    updatedVariant.shoppingMallProductId,
    product.id,
  );
  TestValidator.equals(
    "variantId remains unchanged",
    updatedVariant.id,
    variant.id,
  );
  TestValidator.predicate(
    "updatedAt updated",
    new Date(updatedVariant.updatedAt).getTime() >
      new Date(variant.updatedAt).getTime(),
  );
}
