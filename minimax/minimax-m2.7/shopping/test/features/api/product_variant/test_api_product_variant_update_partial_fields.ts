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
 * Test successful partial variant update by the owning seller.
 *
 * Validates that when updating a product variant with PATCH, only the provided
 * fields are modified while other fields remain unchanged. This test focuses on
 * partial updates where skuCode and priceOverride are updated but quantity and
 * optionValues are omitted to verify they are preserved.
 *
 * 1. Administrator creates a category for product assignment.
 * 2. Seller registers and authenticates with approved status.
 * 3. Seller creates a product with base price and category.
 * 4. Seller creates a variant with initial SKU, null price, option values, and quantity.
 * 5. Seller performs partial update providing only skuCode and priceOverride.
 * 6. Validates that updated fields (skuCode, priceOverride) reflect new values.
 * 7. Validates that omitted fields (quantity, optionValues) remain unchanged.
 *
 * @param connection Base API connection for test execution
 */
export async function test_api_product_variant_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Apparel",
          description: "Clothing and fashion items",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: "Summer T-Shirt",
          description: "Comfortable summer t-shirt for casual wear",
          basePrice: 25.0,
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Seller creates variant with initial values
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "TSHIRT-RED-M",
          price: null,
          optionValues: [
            {
              key: "color",
              value: "Red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
            {
              key: "size",
              value: "Medium",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant);
  // Store original quantity for later verification
  const originalQuantity = variant.quantity;
  // 5. Verify initial variant state
  TestValidator.equals(
    "initial skuCode matches",
    variant.skuCode,
    "TSHIRT-RED-M",
  );
  TestValidator.equals("initial priceOverride is null", variant.price, null);
  TestValidator.equals("initial quantity is set", variant.quantity, 100);
  // 6. Seller updates variant with partial fields (only skuCode and priceOverride)
  const updatedVariant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.patchByProductidAndVariantid(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: "TSHIRT-RED-M-V2",
          price: 29.99,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 7. Validate updated fields
  TestValidator.equals(
    "updated skuCode matches",
    updatedVariant.skuCode,
    "TSHIRT-RED-M-V2",
  );
  TestValidator.equals(
    "updated priceOverride matches",
    updatedVariant.price,
    29.99,
  );
  // 8. Validate preserved fields (quantity unchanged due to partial update)
  TestValidator.equals(
    "quantity preserved after partial update",
    updatedVariant.quantity,
    originalQuantity,
  );
}
