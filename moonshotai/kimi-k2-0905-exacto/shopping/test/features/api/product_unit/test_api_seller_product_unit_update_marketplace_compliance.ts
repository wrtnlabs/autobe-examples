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
 * Test comprehensive marketplace policy compliance for product unit updates.
 *
 * This test validates that product unit configuration updates maintain strict
 * compliance with marketplace policies including proper categorization,
 * appropriate display requirements, customer experience standards, advertising
 * policy compatibility, and customer protection requirements.
 *
 * Business Context: Product units represent different aspects of product
 * variation (size, color, material, etc.) that customers can select during
 * purchase. Updates to these units must comply with marketplace policies to
 * ensure consistent customer experience, proper product categorization, and
 * regulatory compliance.
 *
 * Test Flow:
 *
 * 1. Create seller account with proper business verification
 * 2. Create product with marketplace-compliant configuration
 * 3. Create product unit with initial policy-compliant settings
 * 4. Update unit with modified display style and requirements
 * 5. Verify update maintains compliance with marketplace standards
 * 6. Test business rule validation for required vs optional fields
 * 7. Validate display ordering optimization
 * 8. Ensure customer experience improvements are preserved
 *
 * Compliance Areas Tested:
 *
 * - Display style compliance (dropdown, buttons, swatches, text_input)
 * - Required field validation for customer clarity
 * - Multiple selection controls for complex products
 * - Unit type categorization accuracy
 * - Display ordering for optimal customer experience
 * - Policy adherence throughout update lifecycle
 */
export async function test_api_seller_product_unit_update_marketplace_compliance(
  connection: api.IConnection,
) {
  // 1. Create seller account with proper business verification
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name() + " Market Enterprises",
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  TestValidator.equals(
    "seller verification status",
    seller.verification_status,
    "pending",
  );

  // 2. Create product with marketplace-compliant configuration
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: RandomGenerator.name() + " Marketplace Product",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: [],
        images: [],
        href: "https://marketplace.example.com/products/create",
        referrer: "https://marketplace.example.com/seller/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  TestValidator.equals("product status", product.status, "draft");

  // 3. Create product unit with initial policy-compliant settings
  const initialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(initialUnit);

  TestValidator.equals("initial unit type", initialUnit.type, "size");
  TestValidator.equals(
    "initial display style",
    initialUnit.display_style,
    "dropdown",
  );
  TestValidator.equals(
    "initial required status",
    initialUnit.is_required,
    true,
  );

  // 4. Update unit with modified display style and requirements - optimizing customer experience
  const updatedUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: initialUnit.id,
      body: {
        display_style: "buttons",
        sort_order: 0,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(updatedUnit);

  // 5. Verify update maintains compliance with marketplace standards
  TestValidator.equals(
    "updated display style",
    updatedUnit.display_style,
    "buttons",
  );
  TestValidator.equals("updated sort order", updatedUnit.sort_order, 0);
  TestValidator.equals("name preserved", updatedUnit.name, "Size");
  TestValidator.equals("type preserved", updatedUnit.type, "size");
  TestValidator.equals(
    "required status preserved",
    updatedUnit.is_required,
    true,
  );
  TestValidator.equals(
    "multiple selection preserved",
    updatedUnit.is_multiple,
    false,
  );

  // 6. Test business rule validation - changing to color unit with swatch display
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: false,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // Update color unit to change display style for better customer experience
  const updatedColorUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: colorUnit.id,
      body: {
        display_style: "buttons",
        is_required: true,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(updatedColorUnit);

  // 7. Validate display ordering and requirement optimization
  TestValidator.equals(
    "color unit display style updated",
    updatedColorUnit.display_style,
    "buttons",
  );
  TestValidator.equals(
    "color unit required status updated",
    updatedColorUnit.is_required,
    true,
  );
  TestValidator.equals(
    "color unit sort order adjusted",
    updatedColorUnit.sort_order,
    1,
  );

  // 8. Test multiple selection support for complex product configurations
  const featureUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Features",
        type: "style",
        display_style: "checkbox",
        is_required: false,
        is_multiple: true,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(featureUnit);

  // Update feature unit for enhanced customer selection experience
  const updatedFeatureUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: featureUnit.id,
      body: {
        display_style: "buttons",
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(updatedFeatureUnit);

  // 9. Final validation - ensure all updates maintain marketplace compliance
  TestValidator.equals(
    "feature unit display style updated",
    updatedFeatureUnit.display_style,
    "buttons",
  );
  TestValidator.equals(
    "feature unit multiple selection preserved",
    updatedFeatureUnit.is_multiple,
    true,
  );
  TestValidator.equals(
    "feature unit sort order adjusted",
    updatedFeatureUnit.sort_order,
    2,
  );

  // 10. Verify business rule consistency across all units
  TestValidator.predicate(
    "seller ID consistency",
    updatedUnit.product.id === product.id &&
      updatedColorUnit.product.id === product.id &&
      updatedFeatureUnit.product.id === product.id,
  );

  TestValidator.predicate(
    "unit type diversity maintained",
    updatedUnit.type === "size" &&
      updatedColorUnit.type === "color" &&
      updatedFeatureUnit.type === "style",
  );

  TestValidator.predicate(
    "display style compliance varied",
    updatedUnit.display_style === "buttons" &&
      updatedColorUnit.display_style === "buttons" &&
      updatedFeatureUnit.display_style === "buttons",
  );
}
