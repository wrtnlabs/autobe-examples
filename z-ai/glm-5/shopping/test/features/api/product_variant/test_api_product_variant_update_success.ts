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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test successful product variant update by authenticated seller.
 *
 * Scenario: Seller updates their product variant configuration including
 * SKU code, option values, and price override. Verifies all fields are
 * updated correctly while maintaining data integrity.
 *
 * Flow:
 * 1. Authenticate as seller using join utility
 * 2. Create parent product for variant
 * 3. Create variant with initial configuration (SKU, options, price)
 * 4. Update variant with new values (different SKU, options, price)
 * 5. Verify response reflects all changes correctly
 *
 * Validations:
 * - SKU code matches new unique value
 * - Option values reflect updated configuration
 * - Price override matches new value
 * - Product association remains intact
 */
export async function test_api_product_variant_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {},
  );
  typia.assert(seller);
  // 2. Create parent product
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create variant with initial configuration
  const initialSkuCode: string = `SKU-INIT-${RandomGenerator.alphaNumeric(8)}`;
  const initialOptionValues: {
    [key: string]: string;
  } = {
    color: "Red",
    size: "Large",
  };
  const initialPrice: number = 50.0;
  const variant: IShoppingMallProductVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: initialSkuCode,
          option_values: initialOptionValues,
          price: initialPrice,
        },
      },
    );
  typia.assert(variant);
  // Store original timestamps for comparison
  const originalCreatedAt: string = variant.created_at;
  const originalUpdatedAt: string = variant.updated_at;
  // 4. Update variant with new configuration
  const newSkuCode: string = `SKU-UPD-${RandomGenerator.alphaNumeric(8)}`;
  const newOptionValues: {
    [key: string]: string;
  } = {
    color: "Blue",
    size: "Medium",
  };
  const newPrice: number = 45.99;
  const updateBody: IShoppingMallProductVariant.IUpdate = {
    skuCode: newSkuCode,
    optionValues: newOptionValues,
    price: newPrice,
  } satisfies IShoppingMallProductVariant.IUpdate;
  const updatedVariant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate updated values
  TestValidator.equals("updated SKU code", updatedVariant.sku_code, newSkuCode);
  TestValidator.equals(
    "updated option values",
    updatedVariant.option_values,
    newOptionValues,
  );
  TestValidator.equals(
    "updated price override",
    updatedVariant.price,
    newPrice,
  );
  // Validate timestamp integrity
  TestValidator.equals(
    "created_at unchanged",
    updatedVariant.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    updatedVariant.updated_at !== originalUpdatedAt,
  );
  // Validate product association maintained
  TestValidator.equals(
    "product association",
    updatedVariant.product.id,
    product.id,
  );
}
