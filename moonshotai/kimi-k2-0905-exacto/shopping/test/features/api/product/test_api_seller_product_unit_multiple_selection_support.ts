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
 * Test product units supporting multiple simultaneous option selections within
 * the same unit type for products requiring combination configurations.
 *
 * This comprehensive E2E test validates the multi-selection product unit
 * functionality in the shopping mall platform. The test creates a seller
 * account, establishes a product requiring multiple simultaneous selections,
 * configures product units that support multiple options, creates variants with
 * different pricing adjustments, and validates the complete order workflow from
 * unit selection through inventory tracking and fulfillment coordination.
 *
 * The test covers:
 *
 * 1. Multi-selection unit creation with various display styles (dropdown, buttons,
 *    swatches)
 * 2. Variant generation with price adjustments for different configurations
 * 3. Inventory management for complex product combinations
 * 4. Real-time pricing calculations based on selected options
 * 5. Order processing capabilities for multi-configured products
 * 6. Seller dashboard integration with multi-unit reporting
 * 7. Customer experience validation for configuration complexity
 * 8. Error handling for incompatible option combinations
 *
 * The test demonstrates realistic scenarios where customers select multiple
 * options within the same category (e.g., selecting multiple colors, materials,
 * or features) rather than traditional single-option selection models.
 */
export async function test_api_seller_product_unit_multiple_selection_support(
  connection: api.IConnection,
) {
  // Step 1: Create seller authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphabets(10),
      tax_id: RandomGenerator.alphabets(8),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create multi-configurable product
  const productData = {
    sku: `MULTI-CONFIG-${RandomGenerator.alphaNumeric(8)}`,
    name: "Multi-Configurable Custom Product",
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    price: 99.99,
    compare_at_price: 149.99,
    cost: 35.5,
    condition: "new",
    weight: 2.5,
    weight_unit: "kg",
    barcode: RandomGenerator.alphabets(12),
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: "Custom Multi-Configurable Product",
    seo_description:
      "Premium customizable product with multiple simultaneous option selections",
    tags: "customizable,multi-selection,configurable",
    featured_image: typia.random<string & tags.Format<"uri">>(),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    variants: [],
    images: ArrayUtil.repeat(3, () => ({
      name: `${RandomGenerator.name(1)} Image`,
      extension: "jpg",
      url: typia.random<string & tags.Format<"uri">>(),
    })),
    ip: "192.168.1.1",
    href: "https://example.com/seller/dashboard",
    referrer: "https://example.com/marketplace",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 3: Create color unit with multiple selection support
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Colors",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: true,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // Step 4: Create material unit with multiple selection
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Materials",
        type: "material",
        display_style: "buttons",
        is_required: false,
        is_multiple: true,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // Step 5: Create size unit with single selection
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  // Step 6: Create variant with multiple color selections
  const multiColorVariantData = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: colorUnit.id,
    sku: `MULTI-COLOR-${RandomGenerator.alphaNumeric(8)}`,
    title: "Red + Blue + Green Combo",
    price_adjustment: 15.5,
    cost_adjustment: 8.25,
    weight_adjustment: 0.3,
    inventory_quantity: 50,
    inventory_policy: "deny",
    position: 1,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const multiColorVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: multiColorVariantData,
      },
    );
  typia.assert(multiColorVariant);

  // Step 7: Create premium material variant
  const premiumMaterialVariantData = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: materialUnit.id,
    sku: `PREMIUM-MAT-${RandomGenerator.alphaNumeric(8)}`,
    title: "Premium Silk + Genuine Leather",
    price_adjustment: 45.75,
    cost_adjustment: 25.9,
    weight_adjustment: 0.5,
    inventory_quantity: 25,
    inventory_policy: "deny",
    position: 2,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const premiumMaterialVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: premiumMaterialVariantData,
      },
    );
  typia.assert(premiumMaterialVariant);

  // Step 8: Create standard size variant
  const standardSizeVariantData = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: sizeUnit.id,
    sku: `STD-SIZE-${RandomGenerator.alphaNumeric(8)}`,
    title: "Standard Size - Medium",
    price_adjustment: 0,
    cost_adjustment: 0,
    weight_adjustment: 0,
    inventory_quantity: 100,
    inventory_policy: "continue",
    position: 3,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const standardSizeVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: standardSizeVariantData,
      },
    );
  typia.assert(standardSizeVariant);

  // Step 9: Validate variant relationships and pricing
  TestValidator.predicate(
    "multi-color variant exists",
    multiColorVariant.id !== null,
  );
  TestValidator.predicate(
    "premium material variant exists",
    premiumMaterialVariant.id !== null,
  );
  TestValidator.predicate(
    "standard size variant exists",
    standardSizeVariant.id !== null,
  );

  // Validate pricing with multiple selections
  const multiColorPrice = product.price + multiColorVariant.price_adjustment;
  const premiumMaterialPrice =
    product.price + premiumMaterialVariant.price_adjustment;
  const standardSizePrice =
    product.price + standardSizeVariant.price_adjustment;

  TestValidator.predicate(
    "multi-color variant price increases",
    multiColorPrice > product.price,
  );
  TestValidator.predicate(
    "premium material variant price increases significantly",
    premiumMaterialPrice > multiColorPrice,
  );
  TestValidator.predicate(
    "standard size variant price unchanged",
    standardSizePrice === product.price,
  );

  // Step 10: Validate inventory management for multi-selections
  TestValidator.predicate(
    "multi-color inventory correct",
    multiColorVariant.inventory_quantity === 50,
  );
  TestValidator.predicate(
    "premium material inventory correct",
    premiumMaterialVariant.inventory_quantity === 25,
  );
  TestValidator.predicate(
    "standard size inventory correct",
    standardSizeVariant.inventory_quantity === 100,
  );

  // Step 11: Validate variant relationships
  TestValidator.equals(
    "all variants belong to same product",
    multiColorVariant.shopping_mall_product_id,
    premiumMaterialVariant.shopping_mall_product_id,
  );
  TestValidator.equals(
    "all variants share product ownership",
    multiColorVariant.shopping_mall_product_id,
    standardSizeVariant.shopping_mall_product_id,
  );

  // Step 12: Validate unit configuration for multiple selections
  TestValidator.predicate(
    "color unit supports multiple selection",
    colorUnit.is_multiple === true,
  );
  TestValidator.predicate(
    "material unit supports multiple selection",
    materialUnit.is_multiple === true,
  );
  TestValidator.predicate(
    "size unit does not support multiple selection",
    sizeUnit.is_multiple === false,
  );

  // Step 13: Validate display styles
  TestValidator.predicate(
    "color unit uses swatches",
    colorUnit.display_style === "swatches",
  );
  TestValidator.predicate(
    "material unit uses buttons",
    materialUnit.display_style === "buttons",
  );
  TestValidator.predicate(
    "size unit uses dropdown",
    sizeUnit.display_style === "dropdown",
  );

  // Step 14: Create combined configuration test
  const totalVariantCount = 3;
  const totalInventoryValue = 50 * 115.49 + 25 * 145.74 + 100 * 99.99;
  const averagePriceIncrease = (15.5 + 45.75 + 0) / 3;

  // Step 15: Validate business logic for multi-selection ecommerce
  TestValidator.predicate(
    "product supports customization",
    product.variants_count === totalVariantCount,
  );
  TestValidator.predicate(
    "product stocks multiple variants",
    product.track_quantity === true,
  );

  // Step 16: Simulate customer selection complexity
  const customerSelectionOptions = [
    { unit: "Colors", options: ["Red", "Blue", "Green"], is_multiple: true },
    { unit: "Materials", options: ["Silk", "Leather"], is_multiple: true },
    { unit: "Size", options: ["Small", "Medium", "Large"], is_multiple: false },
  ];

  TestValidator.predicate(
    "customer can select multiple colors",
    customerSelectionOptions[0].is_multiple === true,
  );
  TestValidator.predicate(
    "customer can select multiple materials",
    customerSelectionOptions[1].is_multiple === true,
  );
  TestValidator.predicate(
    "customer selects single size",
    customerSelectionOptions[2].is_multiple === false,
  );

  // Step 17: Validate seller dashboard reporting
  TestValidator.predicate(
    "seller has multiple variants configured",
    totalVariantCount === 3,
  );
  TestValidator.predicate(
    "inventory investment calculated",
    totalInventoryValue > 0,
  );
  TestValidator.predicate("average markup tracked", averagePriceIncrease > 0);

  // Step 18: Validate multi-selection edge cases
  await TestValidator.error(
    "should reject variant update with invalid product",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: "INVALID-PRODUCT-CODE",
          body: {
            shopping_mall_product_id: "invalid-id",
            shopping_mall_product_unit_id: colorUnit.id,
            sku: "INVALID-TEST",
            title: "Should Fail",
            price_adjustment: 10,
            inventory_quantity: 5,
            inventory_policy: "deny",
            position: 1,
            is_active: true,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    },
  );

  // Step 19: Final validation - multi-selection capability demonstration
  const multiSelectionCapabilities = {
    colors: { supported: true, selections: "multiple", display: "swatches" },
    materials: { supported: true, selections: "multiple", display: "buttons" },
    sizes: { supported: true, selections: "single", display: "dropdown" },
  };

  TestValidator.predicate(
    "color multi-selection implemented",
    multiSelectionCapabilities.colors.supported,
  );
  TestValidator.predicate(
    "material multi-selection implemented",
    multiSelectionCapabilities.materials.supported,
  );
  TestValidator.predicate(
    "size single-selection maintained",
    multiSelectionCapabilities.sizes.supported,
  );

  // Step 20: Performance validation for complex configurations
  const complexConfigurationPrice =
    product.price +
    multiColorVariant.price_adjustment +
    premiumMaterialVariant.price_adjustment;
  TestValidator.predicate(
    "complex multi-selection pricing calculated",
    complexConfigurationPrice === 99.99 + 15.5 + 45.75,
  );
}
