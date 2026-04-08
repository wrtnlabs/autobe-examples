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
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test creating a product variant without price override to verify base price inheritance.
 *
 * Validates that when a product variant is created without a price value (omitted or null),
 * the variant stores price as null internally. The system should then apply the product's
 * base price when displaying or calculating prices for such variants.
 *
 * Business rules tested:
 * - Variants can be created without explicit price (price is nullable)
 * - When price is omitted, the variant's price field should be null
 * - The product's base price (49.99) serves as the fallback for null-priced variants
 * - Quantity defaults to 0 for new variants (not automatically stocked)
 *
 * 1. Admin creates a category for product assignment.
 * 2. Seller registers and authenticates with approved status.
 * 3. Seller creates a product with base price of 49.99 assigned to the category.
 * 4. Seller creates a variant with SKU 'VAR-BASE-001' and single option: size=Medium.
 * 5. Verify variant is created with price=null (not inherited at creation time).
 * 6. Verify quantity defaults to 0.
 * 7. Verify product's base price is 49.99 (for fallback pricing).
 */
export async function test_api_product_variant_base_price_inheritance(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Category-${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  typia.assert(category);
  // 2. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product with base price 49.99
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: `Test Product ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: 49.99,
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Seller creates a variant without price (no price provided)
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: "VAR-BASE-001",
          optionValues: [
            {
              key: "size",
              value: "Medium",
            },
          ],
          // price is NOT provided - testing null price inheritance
        },
      },
    );
  typia.assert(variant);
  // 5. Verify variant is created with price=null
  TestValidator.equals("variant price should be null", variant.price, null);
  // 6. Verify quantity defaults to 0
  TestValidator.equals("variant quantity should be 0", variant.quantity, 0);
  // 7. Verify product's base price is 49.99 (for fallback pricing)
  TestValidator.equals(
    "product base price should be 49.99",
    product.basePrice,
    49.99,
  );
  // 8. Verify variant option values are correct
  TestValidator.equals(
    "variant should have 1 option value",
    variant.optionValues.length,
    1,
  );
  TestValidator.equals(
    "variant option key should be size",
    variant.optionValues[0].key,
    "size",
  );
  TestValidator.equals(
    "variant option value should be Medium",
    variant.optionValues[0].value,
    "Medium",
  );
  // 9. Verify SKU code is set correctly
  TestValidator.equals(
    "variant SKU code should be VAR-BASE-001",
    variant.skuCode,
    "VAR-BASE-001",
  );
}
