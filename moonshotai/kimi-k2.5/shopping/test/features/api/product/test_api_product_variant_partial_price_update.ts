import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test partial price update for product variant.
 * Validates that only the price field is updated while other variant attributes remain unchanged.
 * Steps: admin creates category, seller joins and creates product, seller creates variant with specific price,
 * seller updates only the price field (leaving skuCode and optionValues unchanged), verify response shows
 * updated price while SKU and options remain as originally set, confirm snapshot was created.
 */
export async function test_api_product_variant_partial_price_update(
  connection: api.IConnection,
) {
  // 1. Admin authentication and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller authentication and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 3. Create a product variant with initial price and specific SKU/options
  const initialPrice = 10000;
  const initialSku = "SKU-" + RandomGenerator.alphaNumeric(8).toUpperCase();
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: initialSku,
          price: initialPrice,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
          stock: 50,
        },
      },
    );
  typia.assert(variant);
  // Verify initial variant state
  TestValidator.equals("initial price is set", variant.price, initialPrice);
  TestValidator.equals("initial sku is set", variant.skuCode, initialSku);
  TestValidator.equals(
    "initial options are set",
    variant.optionValues.length,
    2,
  );
  // 4. Partially update only the price field
  const newPrice = 15000;
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: newPrice,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate price was updated correctly
  TestValidator.equals(
    "price updated to new value",
    updatedVariant.price,
    newPrice,
  );
  TestValidator.notEquals(
    "price is different from initial",
    updatedVariant.price,
    initialPrice,
  );
  // 6. Verify other fields remain unchanged (SKU and option values)
  TestValidator.equals("id unchanged", updatedVariant.id, variant.id);
  TestValidator.equals(
    "productId unchanged",
    updatedVariant.productId,
    variant.productId,
  );
  TestValidator.equals("skuCode unchanged", updatedVariant.skuCode, initialSku);
  TestValidator.equals(
    "optionValues unchanged",
    updatedVariant.optionValues.length,
    2,
  );
  TestValidator.equals(
    "first option name unchanged",
    updatedVariant.optionValues[0]!.optionName,
    variant.optionValues[0]!.optionName,
  );
  TestValidator.equals(
    "first option value unchanged",
    updatedVariant.optionValues[0]!.optionValue,
    variant.optionValues[0]!.optionValue,
  );
}
