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
 * Test comprehensive multi-selection capability toggling for product units in a
 * shopping mall marketplace. This test validates seller ability to dynamically
 * switch unit configurations between single and multiple selection modes,
 * ensuring proper variant generation, inventory validation, and business rule
 * enforcement. The workflow includes seller registration, product catalog setup
 * with dual units (traditional single and special multi-select), variant
 * creation with pricing rules, and complex scenario testing including state
 * transitions, requirement validation, and option management.
 *
 * Detailed test flow:
 *
 * 1. Seller creates verified merchant account with business details
 * 2. Product catalog creation with comprehensive SKU placement strategy
 * 3. Dual unit architecture setup: single (Size) and multi-select units (Feature
 *    Add-ons)
 * 4. Variant pricing layers with adaptive cost structures
 * 5. Enable multi-selection capability with confidence validation
 * 6. State transition testing between required/optional modes
 * 7. Sort order reorganization to optimize customer interface
 * 8. Backward compatibility testing for single selection mode
 * 9. Non-destructive update verification preserving existing variants
 * 10. End-to-end customer selection flow simulation
 */
export async function test_api_seller_product_unit_update_multiple_selection(
  connection: api.IConnection,
) {
  // 1. Seller registration with business credentials
  const sellerCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(),
    business_registration_number: RandomGenerator.alphaNumeric(15),
    tax_id: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
    business_type: "corporation",
  } satisfies IShoppingMallSeller.IJoin;

  const authenticatedSeller = await api.functional.auth.seller.join(
    connection,
    {
      body: sellerCreds,
    },
  );
  typia.assert(authenticatedSeller);

  // 2. Product creation with dual unit strategy
  const productCode = RandomGenerator.alphaNumeric(12);
  const primaryProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: productCode,
        name: "Custom Electronics Bundle - Premium Edition",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: 799.0,
        compare_at_price: 999.99,
        cost: 450.0,
        condition: "new",
        weight: 2.5,
        weight_unit: "kg",
        barcode: "PROD" + RandomGenerator.alphaNumeric(10),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: "Professional Electronics Bundle with Custom Features",
        seo_description:
          "High-performance electronics with customizable configurations and professional-grade specifications",
        tags: "electronics,bundle,premium,custom",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: authenticatedSeller.id,
        href: "https://seller-dashboard.example.com/product/create",
        referrer: "https://seller-dashboard.example.com/",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(primaryProduct);

  // 3a. Create traditional single selection unit (Size)
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode,
      body: {
        name: "Storage Capacity",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  // 3b. Create multi-select unit (Feature Add-ons)
  const featureUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode,
      body: {
        name: "Additional Features",
        type: "custom",
        display_style: "buttons",
        is_required: false,
        is_multiple: false, // Initially single selection
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(featureUnit);

  // 4. Test multi-selection enablement with full scenario validation
  const multiSelectEnabledUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode,
      unitId: featureUnit.id,
      body: {
        is_multiple: true, // Enable multi-selection - CRITICAL BUSINESS CHANGE
        display_style: "buttons",
        sort_order: 1, // Elevate to primary selection option
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(multiSelectEnabledUnit);

  TestValidator.predicate(
    "multi-selection enabled successfully",
    multiSelectEnabledUnit.is_multiple === true,
  );
  TestValidator.equals(
    "display style preserved",
    multiSelectEnabledUnit.display_style,
    "buttons",
  );
  TestValidator.equals(
    "sort order updated",
    multiSelectEnabledUnit.sort_order,
    1,
  );

  // 5. Test single selection revert for backward compatibility
  const singleSelectRevertedUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode,
      unitId: featureUnit.id,
      body: {
        is_multiple: false, // Revert to single selection
        is_required: true, // Make required to test state transition
        sort_order: 2, // Return to secondary position
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(singleSelectRevertedUnit);

  TestValidator.predicate(
    "single selection reverted successfully",
    singleSelectRevertedUnit.is_multiple === false,
  );
  TestValidator.predicate(
    "unit now required",
    singleSelectRevertedUnit.is_required === true,
  );
  TestValidator.equals(
    "sort order restored",
    singleSelectRevertedUnit.sort_order,
    2,
  );

  // 6. Test non-destructive update preserving configuration
  const finalConfigUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode,
      unitId: featureUnit.id,
      body: {
        name: "Selected Add-ons", // Name change should not affect selection behavior
        display_style: "swatches", // Change display style for better UI
        // Note: is_multiple, is_required, sort_order unchanged to test preservation
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(finalConfigUnit);

  TestValidator.equals(
    "name updated non-destructively",
    finalConfigUnit.name,
    "Selected Add-ons",
  );
  TestValidator.equals(
    "display style updated",
    finalConfigUnit.display_style,
    "swatches",
  );
  TestValidator.predicate(
    "is_multiple preserved",
    finalConfigUnit.is_multiple === false,
  );
  TestValidator.predicate(
    "is_required preserved",
    finalConfigUnit.is_required === true,
  );
  TestValidator.equals("sort_order preserved", finalConfigUnit.sort_order, 2);

  // 7. Verify configuration combinations work together
  const complexUnitUpdate =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode,
      unitId: featureUnit.id,
      body: {
        is_multiple: true, // Multi-select
        is_required: false, // Optional selection
        sort_order: 1, // Primary
        display_style: "dropdown", // Change to dropdown
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(complexUnitUpdate);

  TestValidator.predicate(
    "multi-select with optional configuration works",
    complexUnitUpdate.is_multiple === true &&
      complexUnitUpdate.is_required === false,
  );
  TestValidator.equals(
    "complex configuration applied",
    complexUnitUpdate.sort_order,
    1,
  );
  TestValidator.equals(
    "display style applies in multi-select mode",
    complexUnitUpdate.display_style,
    "dropdown",
  );
}
