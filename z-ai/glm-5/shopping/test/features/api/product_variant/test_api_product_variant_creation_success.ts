import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Tests the primary success path where an approved seller creates a product variant
 * with SKU code, multiple option values, price override, and initial stock quantity.
 *
 * Test Flow:
 * 1. Admin account registration and authentication
 * 2. Seller account registration (starts with 'pending' approval status)
 * 3. Admin approves the seller account
 * 4. Approved seller creates a product
 * 5. Seller creates a variant with specific configuration
 * 6. Validate variant creation response
 */
export async function test_api_product_variant_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration - creates seller with 'pending' approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves the seller - changes status from 'pending' to 'approved'
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // 4. Seller creates a product that will own the variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Prepare variant creation request with specific configuration
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const priceOverride = 15000;
  const initialStock = 50;
  const variantBody = {
    skuCode,
    price: priceOverride,
    optionValues: [
      { key: "color", value: "Red" },
      { key: "size", value: "Large" },
    ],
    stockQuantity: initialStock,
  } satisfies IShoppingMallProductVariant.ICreate;
  // 6. Create the variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: variantBody,
      },
    );
  typia.assert(variant);
  // Validations
  TestValidator.equals("SKU code matches request", variant.skuCode, skuCode);
  TestValidator.equals(
    "price override correctly stored",
    variant.price,
    priceOverride,
  );
  TestValidator.equals(
    "variant ID is valid UUID format",
    variant.id.length,
    36,
  );
  TestValidator.equals(
    "product reference matches",
    variant.product.id,
    product.id,
  );
  TestValidator.equals("options count is correct", variant.options.length, 2);
  TestValidator.predicate(
    "color option exists with correct value",
    variant.options.some(
      (option) => option.key === "color" && option.value === "Red",
    ),
  );
  TestValidator.predicate(
    "size option exists with correct value",
    variant.options.some(
      (option) => option.key === "size" && option.value === "Large",
    ),
  );
  TestValidator.equals(
    "variant is active (not deleted)",
    variant.deletedAt,
    null,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    variant.createdAt !== null && variant.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    variant.updatedAt !== null && variant.updatedAt !== undefined,
  );
}
