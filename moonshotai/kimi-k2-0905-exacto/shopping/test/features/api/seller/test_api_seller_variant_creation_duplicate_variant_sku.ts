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
 * Test variant creation with duplicate SKU codes across different variants or
 * products, ensuring system maintains SKU uniqueness across the entire
 * marketplace catalog. Validates proper error handling for SKU conflicts and
 * provides clear guidance to sellers.
 *
 * 1. Create seller account for product management
 * 2. Create base product with initial configuration
 * 3. Define product units for variant options (size, color)
 * 4. Create initial variant with specific SKU
 * 5. Attempt duplicate SKU creation - should fail
 * 6. Test cross-product SKU uniqueness
 * 7. Verify successful unique SKU variant creation
 */
export async function test_api_seller_variant_creation_duplicate_variant_sku(
  connection: api.IConnection,
) {
  // Create seller account
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

  // Create first product with complete required properties
  const productSKU = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const product1 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productSKU,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        compare_at_price: null,
        cost: null,
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        barcode: null,
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: null,
        seo_description: null,
        tags: null,
        featured_image: null,
        category_id: seller.id, // Use seller ID as a valid UUID for category (simulated)
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/products",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);

  // Create product units for size and color variants
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product1.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product1.sku,
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

  // Create initial variant with specific SKU
  const duplicateSKU = `VAR-${RandomGenerator.alphaNumeric(10)}`;
  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product1.sku,
        body: {
          shopping_mall_product_id: product1.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: duplicateSKU,
          title: "Medium Size Variant",
          price_adjustment: 0,
          cost_adjustment: null,
          weight_adjustment: null,
          barcode: null,
          image: null,
          inventory_quantity: 50,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  TestValidator.equals(
    "first variant SKU should match",
    variant1.sku,
    duplicateSKU,
  );

  // Test 1: Attempt to create variant with duplicate SKU within same product - should fail
  await TestValidator.error(
    "duplicate SKU within same product should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product1.sku,
          body: {
            shopping_mall_product_id: product1.id,
            shopping_mall_product_unit_id: colorUnit.id,
            sku: duplicateSKU, // Same SKU as variant1
            title: "Blue Color Variant",
            price_adjustment: 5,
            cost_adjustment: null,
            weight_adjustment: null,
            barcode: null,
            image: null,
            inventory_quantity: 30,
            inventory_policy: "deny",
            position: 2,
            is_active: true,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    },
  );

  // Create second product to test cross-product SKU uniqueness
  const productSKU2 = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const product2 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productSKU2,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        compare_at_price: null,
        cost: null,
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        barcode: null,
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: null,
        seo_description: null,
        tags: null,
        featured_image: null,
        category_id: seller.id, // Use seller ID as valid UUID
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/products",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);

  // Create units for second product
  const sizeUnit2 =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product2.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit2);

  // Test 2: Attempt to use duplicate SKU from first product's variant in second product - should fail
  await TestValidator.error(
    "duplicate SKU across different products should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product2.sku,
          body: {
            shopping_mall_product_id: product2.id,
            shopping_mall_product_unit_id: sizeUnit2.id,
            sku: duplicateSKU, // Same SKU as variant1 from different product
            title: "Large Size Variant",
            price_adjustment: 10,
            cost_adjustment: null,
            weight_adjustment: null,
            barcode: null,
            image: null,
            inventory_quantity: 25,
            inventory_policy: "deny",
            position: 1,
            is_active: true,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    },
  );

  // Test 3: Create variant with unique SKU - should succeed
  const uniqueSKU = `VAR-${RandomGenerator.alphaNumeric(10)}`;
  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product2.sku,
        body: {
          shopping_mall_product_id: product2.id,
          shopping_mall_product_unit_id: sizeUnit2.id,
          sku: uniqueSKU,
          title: "Small Size Variant",
          price_adjustment: -5,
          cost_adjustment: null,
          weight_adjustment: null,
          barcode: null,
          image: null,
          inventory_quantity: 40,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  TestValidator.equals(
    "second variant SKU should be unique",
    variant2.sku,
    uniqueSKU,
  );
  TestValidator.notEquals(
    "SKUs should be different",
    variant1.sku,
    variant2.sku,
  );

  // Test 4: Create another variant within same product with unique SKU - should succeed
  const uniqueSKU2 = `VAR-${RandomGenerator.alphaNumeric(10)}`;
  const variant3 =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product1.sku,
        body: {
          shopping_mall_product_id: product1.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: uniqueSKU2,
          title: "Red Color Variant",
          price_adjustment: 8,
          cost_adjustment: null,
          weight_adjustment: null,
          barcode: null,
          image: null,
          inventory_quantity: 20,
          inventory_policy: "continue", // Allow backorder
          position: 3,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  TestValidator.equals(
    "third variant SKU should be unique",
    variant3.sku,
    uniqueSKU2,
  );

  // Verify all variants have unique SKUs
  const allSKUs = [variant1.sku, variant2.sku, variant3.sku];
  const uniqueSKUs = [...new Set(allSKUs)];
  TestValidator.equals(
    "all variant SKUs should be unique",
    uniqueSKUs.length,
    allSKUs.length,
  );

  // Additional test: Verify SKU format patterns work correctly
  const specialSKU = `SKU-${RandomGenerator.alphaNumeric(5).toUpperCase()}-${typia.random<number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<999>>()}`;
  const variant4 =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product1.sku,
        body: {
          shopping_mall_product_id: product1.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: specialSKU,
          title: "Green Color Variant",
          price_adjustment: 12,
          cost_adjustment: null,
          weight_adjustment: null,
          barcode: null,
          image: null,
          inventory_quantity: 15,
          inventory_policy: "deny",
          position: 4,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant4);
  TestValidator.equals(
    "special format SKU should work",
    variant4.sku,
    specialSKU,
  );
}
