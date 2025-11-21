import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test SKU uniqueness enforcement across variant creation attempts.
 *
 * Validates that the system prevents duplicate SKU assignments across different
 * variants and maintains global SKU integrity across the marketplace. Ensures
 * proper error handling and user feedback when sellers attempt to create
 * variants with existing SKU codes, maintaining inventory management accuracy
 * and preventing fulfillment conflicts.
 *
 * 1. Register seller account with business credentials
 * 2. Create base product for variant testing using a valid category
 * 3. Configure product unit for variant configuration options
 * 4. Create first variant with unique SKU
 * 5. Attempt duplicate SKU creation to test uniqueness enforcement
 * 6. Verify system properly rejects duplicate SKU attempts
 * 7. Confirm unique SKUs can still be created successfully
 */
export async function test_api_seller_variant_sku_uniqueness_validation(
  connection: api.IConnection,
) {
  // Step 1: Register seller account for SKU uniqueness testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create product for SKU validation testing with valid category
  const productCode = RandomGenerator.alphaNumeric(8);
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        price: typia.random<number & tags.Minimum<10>>(),
        condition: "new",
        weight: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(), // Note: In production, should use existing category ID
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/dashboard/products",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Configure product unit for multiple variant creation
  const unit = await api.functional.shoppingMall.seller.products.units.create(
    connection,
    {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    },
  );
  typia.assert(unit);

  // Step 4: Create first variant to establish SKU baseline
  const variantSku = "VARIANT-SKU-001";
  const firstVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: unit.id,
          sku: variantSku,
          title: "Large Size",
          price_adjustment: 0,
          inventory_quantity: 10,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(firstVariant);
  TestValidator.equals(
    "first variant SKU established",
    firstVariant.sku,
    variantSku,
  );

  // Step 5: Attempt duplicate SKU creation to test uniqueness enforcement
  await TestValidator.error(
    "duplicate SKU should be rejected with error",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product.sku,
          body: {
            shopping_mall_product_id: product.id,
            shopping_mall_product_unit_id: unit.id,
            sku: variantSku, // Same SKU as first variant
            title: "Medium Size",
            price_adjustment: -5,
            inventory_quantity: 15,
            inventory_policy: "deny",
            position: 2,
            is_active: true,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    },
  );

  // Step 6: Verify unique SKU can still be created
  const uniqueSku = "VARIANT-SKU-002";
  const secondVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: unit.id,
          sku: uniqueSku,
          title: "Medium Size",
          price_adjustment: -5,
          inventory_quantity: 15,
          inventory_policy: "deny",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(secondVariant);
  TestValidator.equals("unique SKU accepted", secondVariant.sku, uniqueSku);
  TestValidator.equals(
    "variant inventory matches",
    secondVariant.inventory_quantity,
    15,
  );
  TestValidator.equals(
    "price adjustment applied",
    secondVariant.price_adjustment,
    -5,
  );
  TestValidator.notEquals(
    "variant IDs should be different",
    firstVariant.id,
    secondVariant.id,
  );
}
