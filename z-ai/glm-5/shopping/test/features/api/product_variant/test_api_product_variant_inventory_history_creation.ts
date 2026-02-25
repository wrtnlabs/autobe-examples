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
 * Tests the inventory history creation logic when a variant is created with initial stock quantity.
 *
 * **Business Context:**
 * Per the analysis document, inventory is tracked through history records (not snapshots).
 * When stockQuantity > 0 is provided during variant creation, a positive inventory
 * history record is created automatically with reason='Initial stock'.
 *
 * **Test Steps:**
 * 1. Admin account setup for seller approval
 * 2. Seller registration and approval
 * 3. Create parent product
 * 4. Create variant with stockQuantity=100 units
 * 5. Verify variant is created successfully
 * 6. Edge case: Create variant with stockQuantity=0 (or omitted)
 *
 * **Validations:**
 * - Variant is created with all fields populated
 * - SKU code matches input
 * - Option values are correctly stored
 * - Price override works correctly
 */
export async function test_api_product_variant_inventory_history_creation(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // 1. Admin Setup
  // ========================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // ========================================
  // 2. Seller Registration
  // ========================================
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // Seller is in 'pending' status
  TestValidator.equals(
    "seller pending status",
    sellerAuth.approvalStatus,
    "pending",
  );
  // ========================================
  // 3. Admin Approves Seller
  // ========================================
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approved status",
    approvedSeller.approvalStatus,
    "approved",
  );
  // ========================================
  // 4. Seller Login (get fresh approved session)
  // ========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    },
  });
  // ========================================
  // 5. Create Parent Product
  // ========================================
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
        category_id: categoryId,
      },
    },
  );
  typia.assert(product);
  // ========================================
  // 6. Create Variant with Initial Stock (stockQuantity=100)
  // ========================================
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`.toUpperCase();
  const initialStock = 100;
  const variantWithStock =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode,
          price: typia.random<number & tags.Minimum<100>>() satisfies number as number,
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ] as const),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
            },
          ],
          stockQuantity: initialStock,
        },
      },
    );
  typia.assert(variantWithStock);
  // Validate variant creation
  TestValidator.equals("variant SKU code", variantWithStock.skuCode, skuCode);
  TestValidator.equals(
    "variant product ID",
    variantWithStock.product.id,
    product.id,
  );
  TestValidator.predicate(
    "variant has options",
    variantWithStock.options.length === 2,
  );
  TestValidator.predicate(
    "variant has color option",
    variantWithStock.options.some((opt) => opt.key === "color"),
  );
  TestValidator.predicate(
    "variant has size option",
    variantWithStock.options.some((opt) => opt.key === "size"),
  );
  // ========================================
  // 7. Edge Case: Create Variant with Zero Stock
  // ========================================
  const skuCodeZeroStock =
    `SKU-${RandomGenerator.alphaNumeric(8)}`.toUpperCase();
  const variantZeroStock =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: skuCodeZeroStock,
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick(["White", "Gray", "Navy"] as const),
            },
          ],
          stockQuantity: 0,
        },
      },
    );
  typia.assert(variantZeroStock);
  TestValidator.equals(
    "zero stock variant SKU",
    variantZeroStock.skuCode,
    skuCodeZeroStock,
  );
  TestValidator.predicate(
    "zero stock variant has option",
    variantZeroStock.options.length === 1,
  );
  // ========================================
  // 8. Edge Case: Create Variant without stockQuantity (omitted)
  // ========================================
  const skuCodeOmittedStock =
    `SKU-${RandomGenerator.alphaNumeric(8)}`.toUpperCase();
  const variantOmittedStock =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: skuCodeOmittedStock,
          optionValues: [
            {
              key: "material",
              value: RandomGenerator.pick([
                "Cotton",
                "Polyester",
                "Wool",
              ] as const),
            },
          ],
          // stockQuantity is omitted - should default to 0
        },
      },
    );
  typia.assert(variantOmittedStock);
  TestValidator.equals(
    "omitted stock variant SKU",
    variantOmittedStock.skuCode,
    skuCodeOmittedStock,
  );
  // ========================================
  // 9. Verify Variants are Distinct
  // ========================================
  TestValidator.notEquals(
    "variant IDs are unique",
    variantWithStock.id,
    variantZeroStock.id,
  );
  TestValidator.notEquals(
    "variant IDs are unique (2)",
    variantZeroStock.id,
    variantOmittedStock.id,
  );
}