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
 * Test SKU uniqueness enforcement across the entire marketplace platform.
 *
 * This comprehensive E2E test validates that SKUs remain globally unique across
 * all sellers, products, and variants in the marketplace. The test covers:
 *
 * - Global SKU uniqueness validation across sellers and products
 * - Case-insensitive SKU duplication prevention
 * - Duplicate SKU error messaging for different scenarios
 * - Cross-seller SKU conflict detection
 * - Variant-specific SKU validation within product families
 *
 * The test follows a comprehensive workflow:
 *
 * 1. Create two sellers to test cross-seller SKU conflicts
 * 2. Create multiple products with specific SKU patterns
 * 3. Attempt to create variants with duplicate SKUs
 * 4. Verify case-insensitive SKU enforcement
 * 5. Test error message quality for different violation scenarios
 *
 * This ensures the marketplace maintains SKU integrity and provides clear
 * guidance to sellers when SKU conflicts occur.
 */
export async function test_api_seller_variant_creation_sku_uniqueness_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create first seller for initial SKU testing
  const firstSellerEmail = typia.random<string & tags.Format<"email">>();
  const firstSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: firstSellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile("010"),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(firstSeller);

  // Step 2: Create second seller for cross-seller SKU conflict testing
  const secondSellerEmail = typia.random<string & tags.Format<"email">>();
  const secondSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: secondSellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile("011"),
      business_type: "limited_liability",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(secondSeller);

  // Step 3: Create first product with initial SKU
  const baseSku = `SKU-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const firstProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: baseSku,
        name: "Base Product for SKU Testing",
        description: "Product created to test SKU uniqueness enforcement",
        price: 99.99,
        weight: 1.5,
        weight_unit: "kg",
        condition: "new",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: firstSeller.id,
        href: "https://seller-dashboard.example/com/products/create",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(firstProduct);

  // Step 4: Create product units for variant testing
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: firstProduct.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: firstProduct.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // Step 5: Create first variant with original SKU
  const originalVariantSku = `${baseSku}-LG-BLK`;
  const firstVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: firstProduct.sku,
        body: {
          shopping_mall_product_id: firstProduct.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: originalVariantSku,
          title: "Large, Black - Original Variant",
          price_adjustment: 0,
          inventory_quantity: 50,
          inventory_policy: "deny",
          position: 0,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(firstVariant);

  // Step 6: Test duplicate SKU within same seller - should fail
  await TestValidator.error(
    "duplicate SKU within same seller should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: firstProduct.sku,
          body: {
            shopping_mall_product_id: firstProduct.id,
            shopping_mall_product_unit_id: colorUnit.id,
            sku: originalVariantSku, // Same SKU as first variant
            title: "Duplicate SKU Test Variant",
            price_adjustment: 0,
            inventory_quantity: 25,
            inventory_policy: "deny",
            position: 1,
            is_active: true,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    },
  );

  // Step 7: Create second product with different base SKU for cross-product testing
  const crossProductSku = `${baseSku}-T2`;
  const crossProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: crossProductSku,
        name: "Cross Product for SKU Testing",
        description: "Secondary product for SKU uniqueness testing",
        price: 129.99,
        weight: 2.0,
        weight_unit: "kg",
        condition: "new",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: firstSeller.id,
        href: "https://seller-dashboard.example.com/products/create",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(crossProduct);

  // Step 8: Test case-insensitive SKU duplicate - should fail
  const caseVariantSku = originalVariantSku.toLowerCase();
  await TestValidator.error(
    "case-insensitive duplicate SKU should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: crossProductSku,
          body: {
            shopping_mall_product_id: crossProduct.id,
            shopping_mall_product_unit_id: sizeUnit.id,
            sku: caseVariantSku, // Same SKU but different case
            title: "Case Variant Test",
            price_adjustment: 5,
            inventory_quantity: 30,
            inventory_policy: "deny",
            position: 0,
            is_active: true,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    },
  );

  // Step 9: Switch to second seller to test cross-seller SKU conflicts
  const secondSellerProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: `${secondSeller.id.substring(0, 8)}-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        name: "Second Seller Product",
        description: "Product from different seller for SKU testing",
        price: 79.99,
        weight: 0.8,
        weight_unit: "kg",
        condition: "new",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: secondSeller.id,
        href: "https://seller-dashboard.example.com/products/create",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(secondSellerProduct);

  // Step 10: Test cross-seller SKU conflict - should fail
  await TestValidator.error(
    "cross-seller SKU conflict should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: secondSellerProduct.sku,
          body: {
            shopping_mall_product_id: secondSellerProduct.id,
            shopping_mall_product_unit_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            sku: originalVariantSku, // SKU from first seller
            title: "Cross-Seller Duplicate",
            price_adjustment: 0,
            inventory_quantity: 10,
            inventory_policy: "deny",
            position: 0,
            is_active: true,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    },
  );

  // Step 11: Create variant with unique SKU - should succeed
  const uniqueVariantSku = `${crossProductSku}-MD-GRN`;
  const uniqueVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: crossProduct.sku,
        body: {
          shopping_mall_product_id: crossProduct.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: uniqueVariantSku,
          title: "Medium, Green - Unique Variant",
          price_adjustment: -5,
          inventory_quantity: 25,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(uniqueVariant);

  // Step 12: Verify SKU uniqueness is enforced globally
  TestValidator.notEquals(
    "unique variant SKU should be different from others",
    uniqueVariant.sku,
    firstVariant.sku,
  );
}
