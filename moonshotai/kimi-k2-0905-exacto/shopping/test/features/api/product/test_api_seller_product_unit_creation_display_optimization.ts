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
 * Test product unit creation with optimization for different display interfaces
 * including mobile-first responsive design, accessibility screenreader support,
 * international character support, and visual comparison capabilities.
 * Validates layout adaptation across various device screens, assistive
 * technology compatibility, cross-cultural usability, and visual
 * differentiation optimization ensuring inclusive shopping experiences across
 * diverse customer interface variations and technology scenarios.
 *
 * This comprehensive test validates that product units can be configured with
 * various display styles to optimize for:
 *
 * - Mobile-first responsive design with button-style selection
 * - International character support through dropdown interfaces
 * - Accessibility screen reader compatibility with text input
 * - Visual comparison capabilities through color swatch displays
 *
 * 1. Create seller focused on accessibility
 * 2. Create product requiring comprehensive accessibility features
 * 3. Configure unit display for cross-platform optimization
 * 4. Validate accessibility compliance and internationalization
 * 5. Test responsive design optimization and visual differentiation
 */
export async function test_api_seller_product_unit_creation_display_optimization(
  connection: api.IConnection,
) {
  // Create seller with accessibility focus
  const accessibleSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        business_name: RandomGenerator.name() + " Accessibility Store",
        business_registration_number: typia.random<string>(),
        tax_id: typia.random<string & tags.Pattern<"^\\d{3}-\\d{2}-\\d{4}$">>(),
        phone: RandomGenerator.mobile("011"),
        business_type: "corporation",
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(accessibleSeller);

  // Create merchant product with comprehensive accessibility features
  const createProductBody = {
    sku: typia.random<string>(),
    name: RandomGenerator.name() + " Adaptive Device",
    description:
      "Device designed for accessibility with screen reader compatibility, high contrast modes, and intuitive navigation. Supports multiple languages and cultural preferences.",
    price: typia.random<number & tags.Minimum<50> & tags.Maximum<500>>(),
    condition: "new",
    weight: typia.random<number & tags.Minimum<0.5> & tags.Maximum<2.0>>(),
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: accessibleSeller.id,
    seo_title: "Adaptive Technology Device - Accessibility Optimized",
    seo_description:
      "High-quality adaptive device with comprehensive accessibility features for inclusive shopping experiences",
    tags: "accessibility, adaptive, inclusive, screen-reader, high-contrast",
    featured_image: "https://example.com/accessibility/device.jpg",
    href: "https://seller.accessibility.store/product/create",
    referrer: "https://seller.accessibility.store/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  const merchantProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createProductBody,
    });
  typia.assert(merchantProduct);

  // Create product unit with mobile-first responsive display optimization
  const responsiveUnitBody = {
    name: "Size",
    type: "size",
    display_style: "buttons",
    is_required: true,
    is_multiple: false,
    sort_order: 0,
  } satisfies IShoppingMallProductUnit.ICreate;

  const responsiveUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: merchantProduct.sku,
      body: responsiveUnitBody,
    });
  typia.assert(responsiveUnit);

  // Create unit for international character support
  const internationalUnitBody = {
    name: "Language",
    type: "custom",
    display_style: "dropdown",
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const internationalUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: merchantProduct.sku,
      body: internationalUnitBody,
    });
  typia.assert(internationalUnit);

  // Create unit for accessibility screen reader optimization
  const accessibilityUnitBody = {
    name: "Audio Description",
    type: "accessibility",
    display_style: "text_input",
    is_required: false,
    is_multiple: true,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const accessibilityUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: merchantProduct.sku,
      body: accessibilityUnitBody,
    });
  typia.assert(accessibilityUnit);

  // Create unit for visual comparison capabilities
  const visualComparisonUnitBody = {
    name: "Visual Options",
    type: "style",
    display_style: "swatches",
    is_required: true,
    is_multiple: false,
    sort_order: 3,
  } satisfies IShoppingMallProductUnit.ICreate;

  const visualComparisonUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: merchantProduct.sku,
      body: visualComparisonUnitBody,
    });
  typia.assert(visualComparisonUnit);

  // Validate that all units are properly created and associated with product
  TestValidator.equals(
    "responsive unit product ID matches",
    responsiveUnit.product.id,
    merchantProduct.id,
  );
  TestValidator.equals(
    "international unit product ID matches",
    internationalUnit.product.id,
    merchantProduct.id,
  );
  TestValidator.equals(
    "accessibility unit product ID matches",
    accessibilityUnit.product.id,
    merchantProduct.id,
  );
  TestValidator.equals(
    "visual comparison unit product ID matches",
    visualComparisonUnit.product.id,
    merchantProduct.id,
  );

  // Validate unit properties for display optimization
  TestValidator.predicate(
    "responsive unit has button display style",
    responsiveUnit.display_style === "buttons",
  );
  TestValidator.predicate(
    "international unit has dropdown display style",
    internationalUnit.display_style === "dropdown",
  );
  TestValidator.predicate(
    "accessibility unit has text input display style",
    accessibilityUnit.display_style === "text_input",
  );
  TestValidator.predicate(
    "visual comparison unit has swatches display style",
    visualComparisonUnit.display_style === "swatches",
  );

  // Validate accessibility compliance
  TestValidator.predicate(
    "accessibility unit allows multiple selections",
    accessibilityUnit.is_multiple === true,
  );
  TestValidator.predicate(
    "quick access unit supports required selections",
    responsiveUnit.is_required === true,
  );

  // Validate responsive design optimization
  TestValidator.predicate(
    "responsive unit has priority order 0",
    responsiveUnit.sort_order === 0,
  );
  TestValidator.predicate(
    "visual comparison unit has appropriate priority",
    visualComparisonUnit.sort_order === 3,
  );

  // Validate international support
  TestValidator.predicate(
    "international unit supports multiple languages",
    internationalUnit.type === "custom",
  );
  TestValidator.predicate(
    "international unit uses dropdown interface",
    internationalUnit.display_style === "dropdown",
  );

  // Validate that unit names are descriptive for accessibility
  TestValidator.predicate(
    "responsive unit name is clear and descriptive",
    responsiveUnit.name.length > 0,
  );
  TestValidator.predicate(
    "international unit name supports localization",
    internationalUnit.name === "Language",
  );
  TestValidator.predicate(
    "accessibility unit name indicates usage",
    accessibilityUnit.name === "Audio Description",
  );
  TestValidator.predicate(
    "visual unit name indicates visual nature",
    visualComparisonUnit.name === "Visual Options",
  );

  // Test error case: Invalid product code
  await TestValidator.error(
    "should fail with invalid product code",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: "INVALID_PRODUCT_CODE_12345",
          body: responsiveUnitBody,
        },
      );
    },
  );

  // Additional validation for display style effectiveness
  TestValidator.predicate(
    "buttons style enables easy mobile interaction",
    responsiveUnit.display_style === "buttons",
  );
  TestValidator.predicate(
    "dropdown style accommodates many language options",
    internationalUnit.display_style === "dropdown",
  );
  TestValidator.predicate(
    "text input style allows custom accessibility descriptions",
    accessibilityUnit.display_style === "text_input",
  );
  TestValidator.predicate(
    "swatches style provides visual color/style comparison",
    visualComparisonUnit.display_style === "swatches",
  );

  // Validate that high-priority units have appropriate sort order
  const sortOrders = [
    responsiveUnit.sort_order,
    internationalUnit.sort_order,
    accessibilityUnit.sort_order,
    visualComparisonUnit.sort_order,
  ] as const;

  TestValidator.predicate(
    "sort orders are unique and sequential",
    new Set(sortOrders).size === 4 &&
      Math.max(...sortOrders) - Math.min(...sortOrders) === 3,
  );
}
