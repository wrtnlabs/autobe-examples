import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test variant price override removal and base price fallback mechanism.
 *
 * Validates that a seller can remove a price override from a variant by setting the price field to null in the update request, and that the variant subsequently falls back to the parent product's base price as the effective purchase price.
 *
 * The test also verifies that the update operation is isolated — only the price field changes while other variant attributes (identifier, SKU code, stock quantity) remain intact. A snapshot of the variant's previous state is expected to be created on the server side, preserving the price override value in the audit trail.
 *
 * 1. Administrator registers and authenticates for platform management.
 * 2. Seller registers a new account in pending approval status.
 * 3. Administrator approves the seller, granting full selling privileges.
 * 4. Administrator creates a product category for the test product.
 * 5. Seller creates a product with a known base price of $100.
 * 6. Seller creates a variant with a price override of $120.
 * 7. Seller updates the variant setting price to null, removing the override.
 * 8. Validates that price is null, base_price remains $100, and other attributes are unchanged.
 */
export async function test_api_variant_update_price_override_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Administrator approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Administrator creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Seller creates a product with known base price
  const basePrice = 100;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
        base_price: basePrice,
      },
    },
  );
  typia.assert(product);
  TestValidator.equals("product base price", product.base_price, basePrice);
  // 6. Seller creates a variant with price override
  const priceOverride = 120;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          price: priceOverride,
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  TestValidator.equals(
    "variant has price override",
    variant.price,
    priceOverride,
  );
  TestValidator.equals(
    "variant base price from product",
    variant.base_price,
    basePrice,
  );
  // 7. Seller updates variant — remove price override
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: null,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 8. Validate response
  TestValidator.equals(
    "price should be null after override removal",
    updatedVariant.price,
    null,
  );
  TestValidator.equals(
    "base_price should remain unchanged",
    updatedVariant.base_price,
    basePrice,
  );
  TestValidator.equals(
    "variant id should not change",
    updatedVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "SKU code should remain unchanged",
    updatedVariant.code,
    variant.code,
  );
  TestValidator.equals(
    "stock quantity should remain unchanged",
    updatedVariant.stock_quantity,
    variant.stock_quantity,
  );
}
