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
 * Test successful variant update by owning seller.
 *
 * Validates the complete flow where an approved seller can update their product
 * variant details including SKU code, price override, and stock quantity. This
 * test ensures that the variant update endpoint correctly persists changes and
 * maintains data integrity throughout the operation.
 *
 * The test follows this sequence:
 * 1. Seller registers and authenticates on the platform
 * 2. Admin creates a category required for product assignment
 * 3. Seller creates a product within the category
 * 4. Seller creates an initial product variant with specific values
 * 5. Seller updates the variant with new SKU, price override, and quantity
 * 6. Response validation confirms updated values are correctly persisted
 *
 * Business rules tested:
 * - Sellers can only update variants of products they own
 * - SKU codes can be changed to new unique values
 * - Price overrides can be added or modified
 * - Stock quantities can be increased or decreased
 */
export async function test_api_product_variant_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Create admin account and authenticate for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Admin creates a category for product assignment
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Seller creates a product in that category
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: 19.99,
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Seller creates a product variant with initial values
  const initialSku = "ORIGINAL-SKU";
  const initialQuantity = 10;
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: initialSku,
          price: null,
          optionValues: [{ key: "Color", value: "Blue" }],
        },
      },
    );
  typia.assert(variant);
  // Validate initial variant state
  TestValidator.equals("initial SKU matches", variant.skuCode, initialSku);
  TestValidator.equals("initial price is null", variant.price, null);
  TestValidator.equals("initial quantity is 0", variant.quantity, 0);
  // 6. Seller updates the variant with new values
  const updatedSku = "UPDATED-SKU-001";
  const updatedPrice = 29.99;
  const updatedQuantity = 25;
  const updatedVariant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.putByProductidAndVariantid(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: updatedSku,
          price: updatedPrice,
          quantity: updatedQuantity,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 7. Validate response contains updated values
  TestValidator.equals(
    "updated SKU matches",
    updatedVariant.skuCode,
    updatedSku,
  );
  TestValidator.equals(
    "updated price matches",
    updatedVariant.price,
    updatedPrice,
  );
  TestValidator.equals(
    "updated quantity matches",
    updatedVariant.quantity,
    updatedQuantity,
  );
}
