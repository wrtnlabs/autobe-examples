import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_update_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful update of a product variant by an approved seller.
   * 1. Seller registration and authentication
   * 2. Product creation
   * 3. Variant creation
   * 4. Variant update
   * 5. Validation
   */
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create product (utility handles random categoryId)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant
  const originalSkuCode =
    `SKU-${RandomGenerator.alphaNumeric(8)}`.toUpperCase();
  const originalOptionValues = {
    color: "Red",
    size: "Medium",
  };
  const originalPrice = 100.0;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: originalSkuCode,
          optionValues: originalOptionValues,
          price: originalPrice,
        },
      },
    );
  typia.assert(variant);
  // 4. Update variant with new values
  const newOptionValues = {
    color: "Blue",
    size: "Large",
  };
  const newPrice = 150.0;
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          option_values: newOptionValues,
          price: newPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate updates
  TestValidator.equals("variant ID unchanged", updatedVariant.id, variant.id);
  TestValidator.equals(
    "product ID preserved",
    updatedVariant.product.id,
    product.id,
  );
  TestValidator.equals(
    "SKU code unchanged",
    updatedVariant.skuCode,
    originalSkuCode,
  );
  TestValidator.equals(
    "option values updated - color",
    updatedVariant.optionValues.color,
    "Blue",
  );
  TestValidator.equals(
    "option values updated - size",
    updatedVariant.optionValues.size,
    "Large",
  );
  TestValidator.equals("price updated", updatedVariant.price, newPrice);
  TestValidator.predicate(
    "updatedAt is newer than createdAt",
    new Date(updatedVariant.updatedAt).getTime() >=
      new Date(variant.createdAt).getTime(),
  );
}
