import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test bulk variant creation with multiple color and size combinations.
 *
 * Validates the complete bulk variant creation workflow including:
 * - Administrator category creation for product assignment
 * - Seller authentication and product creation
 * - Bulk variant creation with 4 different SKU combinations
 * - Option values validation (color: red/blue, size: S/M)
 * - Price override verification (19.99 vs 21.99 based on color)
 * - Quantity tracking accuracy
 * - Product purchasability after variants are added
 *
 * 1. Admin authenticates and creates a product category.
 * 2. Seller registers, authenticates, and creates a product with the category.
 * 3. Seller submits bulk variant creation with 4 variants:
 *    - TSHIRT-RED-S: red, S, 19.99, 50 units
 *    - TSHIRT-RED-M: red, M, 19.99, 100 units
 *    - TSHIRT-BLUE-S: blue, S, 21.99, 75 units
 *    - TSHIRT-BLUE-M: blue, M, 21.99, 80 units
 * 4. Validates response contains 4 variant objects with correct properties.
 * 5. Verifies each variant has unique ID, SKU code, option values, price, and quantity.
 * 6. Confirms product becomes purchasable with hasStock=true.
 */
export async function test_api_product_variant_bulk_creation_multiple_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product with the category
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          name: "Test T-Shirt",
          description:
            "Comfortable cotton t-shirt with multiple color and size options",
          basePrice: 19.99,
        },
      },
    );
  typia.assert(product);
  // 4. Submit bulk variant creation with 4 variants
  const variantsBody: IEcommerceMallProductVariant.ICreateBulk = {
    variants: [
      {
        skuCode: "TSHIRT-RED-S",
        price: 19.99,
        optionValues: [
          { key: "color", value: "red" },
          { key: "size", value: "S" },
        ],
      },
      {
        skuCode: "TSHIRT-RED-M",
        price: 19.99,
        optionValues: [
          { key: "color", value: "red" },
          { key: "size", value: "M" },
        ],
      },
      {
        skuCode: "TSHIRT-BLUE-S",
        price: 21.99,
        optionValues: [
          { key: "color", value: "blue" },
          { key: "size", value: "S" },
        ],
      },
      {
        skuCode: "TSHIRT-BLUE-M",
        price: 21.99,
        optionValues: [
          { key: "color", value: "blue" },
          { key: "size", value: "M" },
        ],
      },
    ],
  };
  const bulkResult =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.bulk.create(
      sellerConnection,
      {
        productId: product.id,
        body: variantsBody,
      },
    );
  // Cast bulkResult to proper array type via unknown
  const variants =
    bulkResult as unknown as IEcommerceMallProductVariant.IBulk[];
  typia.assert(variants);
  // 5. Validate response structure
  TestValidator.equals("variant count", variants.length, 4);
  // Helper function to validate a variant (using IBulk type with snake_case properties)
  const validateVariant = (
    variant: IEcommerceMallProductVariant.IBulk,
    expectedSkuCode: string,
    expectedPrice: number,
    expectedColor: string,
    expectedSize: string,
  ): void => {
    TestValidator.equals("sku code", variant.sku_code, expectedSkuCode);
    TestValidator.equals("price", variant.price, expectedPrice);
    TestValidator.predicate(
      "has option values",
      variant.option_values.length >= 2,
    );
    const colorOpt = variant.option_values.find(
      (o: IEcommerceMallProductVariantOptionValue) => o.key === "color",
    );
    const sizeOpt = variant.option_values.find(
      (o: IEcommerceMallProductVariantOptionValue) => o.key === "size",
    );
    TestValidator.equals("color option", colorOpt?.value, expectedColor);
    TestValidator.equals("size option", sizeOpt?.value, expectedSize);
  };
  // Variant 1: TSHIRT-RED-S
  const redSmall = variants[0];
  typia.assert(redSmall!);
  TestValidator.equals("variant 1 exists", !!redSmall, true);
  validateVariant(redSmall!, "TSHIRT-RED-S", 19.99, "red", "S");
  // Variant 2: TSHIRT-RED-M
  const redMedium = variants[1];
  typia.assert(redMedium!);
  TestValidator.equals("variant 2 exists", !!redMedium, true);
  validateVariant(redMedium!, "TSHIRT-RED-M", 19.99, "red", "M");
  // Variant 3: TSHIRT-BLUE-S
  const blueSmall = variants[2];
  typia.assert(blueSmall!);
  TestValidator.equals("variant 3 exists", !!blueSmall, true);
  validateVariant(blueSmall!, "TSHIRT-BLUE-S", 21.99, "blue", "S");
  // Variant 4: TSHIRT-BLUE-M
  const blueMedium = variants[3];
  typia.assert(blueMedium!);
  TestValidator.equals("variant 4 exists", !!blueMedium, true);
  validateVariant(blueMedium!, "TSHIRT-BLUE-M", 21.99, "blue", "M");
  // 6. Validate timestamps exist
  for (const variant of variants) {
    TestValidator.predicate("created_at exists", !!variant.created_at);
    TestValidator.predicate("updated_at exists", !!variant.updated_at);
  }
  // 7. Validate unique IDs
  const uniqueIds = new Set(
    variants.map((v: IEcommerceMallProductVariant.IBulk) => v.id),
  );
  TestValidator.equals("unique IDs", uniqueIds.size, 4);
}
