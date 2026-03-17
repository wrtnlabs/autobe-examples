import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_options_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test retrieving a variant with multiple option values (e.g., Color: Red, Size: Large, Material: Cotton)
 * to verify all option combinations are returned correctly.
 */
export async function test_api_product_variant_multiple_options(
  connection: api.IConnection,
) {
  // 1. Seller authentication - create a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a test product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant with multiple option values (Color, Size, Material)
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(5).toUpperCase()}`,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
            { optionName: "Material", optionValue: "Cotton" },
          ],
          price: typia.random<number & tags.Minimum<0>>(),
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        },
      },
    );
  typia.assert(variant);
  // 4. Retrieve the variant using the public API endpoint
  const retrievedVariant =
    await api.functional.ecommerceMall.products.variants.at(sellerConnection, {
      productId: product.id,
      variantId: variant.id,
    });
  typia.assert(retrievedVariant);
  // 5. Verify the variant has all 3 options
  TestValidator.equals(
    "variant option count",
    retrievedVariant.optionValues.length,
    3,
  );
  // 6. Verify specific option combinations exist
  const hasColorRed = retrievedVariant.optionValues.some(
    (ov: IEcommerceMallProductVariantOption) =>
      ov.optionName === "Color" && ov.optionValue === "Red",
  );
  const hasSizeLarge = retrievedVariant.optionValues.some(
    (ov: IEcommerceMallProductVariantOption) =>
      ov.optionName === "Size" && ov.optionValue === "Large",
  );
  const hasMaterialCotton = retrievedVariant.optionValues.some(
    (ov: IEcommerceMallProductVariantOption) =>
      ov.optionName === "Material" && ov.optionValue === "Cotton",
  );
  TestValidator.predicate("has Color: Red option", hasColorRed);
  TestValidator.predicate("has Size: Large option", hasSizeLarge);
  TestValidator.predicate("has Material: Cotton option", hasMaterialCotton);
  // 7. Verify stock quantity is returned correctly (aggregated from inventory)
  TestValidator.predicate(
    "stock quantity is non-negative",
    retrievedVariant.stockQuantity >= 0,
  );
  // 8. Verify variant properties
  TestValidator.equals(
    "variant SKU matches",
    retrievedVariant.skuCode,
    variant.skuCode,
  );
  TestValidator.equals(
    "variant product ID matches",
    retrievedVariant.productId,
    product.id,
  );
}
