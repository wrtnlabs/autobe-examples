import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test that a product variant with no price override correctly returns price as null.
 *
 * Validates that when a variant is created without specifying a price (price omitted from the request body), the GET variant retrieval endpoint returns `price` as `null`. This null value means the variant inherits the parent product's base price at the service layer.
 *
 * The test covers the complete flow: seller registration, product creation with a known base price, variant creation without price override, variant retrieval, and structural validation of the variant response (SKU code, options, stock, timestamps).
 *
 * 1. Register a seller account via authorize_seller_join.
 * 2. Create a product with base_price of 19.99 using generate_random_e_commerce_mall_seller_products_create.
 * 3. Create a variant under that product with no price override using generate_random_e_commerce_mall_seller_products_variants_create, passing option values (color: 'Blue', size: 'Small').
 * 4. Retrieve the variant via GET /eCommerceMall/seller/products/{productId}/variants/{variantId}.
 * 5. Validate: price is null (inheriting product base_price), sku_code is present, options are present, stock is 0 (initial).
 */
export async function test_api_seller_variant_retrieval_price_inherited_from_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and get authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product with a known base_price
  const basePrice = 19.99;
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: basePrice,
      },
    },
  );
  typia.assert(product);
  // 3. Create variant with no price override (price omitted → inherits product base_price)
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          price: undefined,
          options: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Small" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 4. Retrieve the variant
  const retrievedVariant =
    await api.functional.eCommerceMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  // 5. Validate price inheritance: null means the variant inherits the product's base_price
  TestValidator.equals(
    "variant price is null (inherits product base price)",
    retrievedVariant.price,
    null,
  );
  // 6. Validate variant structure
  TestValidator.predicate(
    "SKU code is present",
    () => retrievedVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "options are present",
    () => retrievedVariant.options.length > 0,
  );
  TestValidator.equals("initial stock is 0", retrievedVariant.stock, 0);
}
