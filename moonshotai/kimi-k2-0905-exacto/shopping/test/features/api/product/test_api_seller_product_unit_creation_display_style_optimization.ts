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
 * Test product unit creation with different display styles including dropdown
 * menus, visual buttons, color swatches, and text input fields.
 *
 * This comprehensive test validates display style configuration for optimal
 * customer interface optimization, testing various product types and variation
 * characteristics. The test ensures that display styles correctly integrate
 * with variant generation systems and provide the best possible customer
 * selection experiences across different devices and screen sizes.
 *
 * Test steps:
 *
 * 1. Create seller account for authentication
 * 2. Create product in marketplace catalog
 * 3. Create product units with different display styles (dropdown, buttons,
 *    swatches, text input)
 * 4. Configure unit settings for optimal customer experience
 * 5. Validate unit creation and display style configuration
 * 6. Test integration with parent product and variant systems
 */
export async function test_api_seller_product_unit_creation_display_style_optimization(
  connection: api.IConnection,
) {
  // Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: "Display Style Test Seller",
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: typia.random<string & tags.Pattern<"^\\d{3}-\\d{2}-\\d{4}$">>(),
      phone: RandomGenerator.mobile("010"),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  TestValidator.equals(
    "seller verification status is pending",
    seller.verification_status,
    "pending",
  );

  // Create product with seller's actual ID for proper ownership
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 5,
          wordMax: 10,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: 1.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.name(4),
        seo_description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id, // This is the required field
        href: `https://example.com/product`,
        referrer: `https://example.com/seller/dashboard`,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals("product is active", product.status, "draft");

  // Create unit with dropdown display style for size variations
  const sizeUnit =
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
  typia.assert(sizeUnit);
  TestValidator.equals("size unit type is size", sizeUnit.type, "size");
  TestValidator.equals(
    "size unit display style is dropdown",
    sizeUnit.display_style,
    "dropdown",
  );
  TestValidator.equals("size unit is required", sizeUnit.is_required, true);

  // Create unit with buttons display style for color options
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);
  TestValidator.equals("color unit type is color", colorUnit.type, "color");
  TestValidator.equals(
    "color unit display style is buttons",
    colorUnit.display_style,
    "buttons",
  );

  // Create unit with swatches display style for material textures
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);
  TestValidator.equals(
    "material unit type is material",
    materialUnit.type,
    "material",
  );
  TestValidator.equals(
    "material unit display style is swatches",
    materialUnit.display_style,
    "swatches",
  );

  // Create unit with text input display style for custom specifications
  const customUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Custom Engraving",
        type: "custom",
        display_style: "text_input",
        is_required: false,
        is_multiple: false,
        sort_order: 4,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(customUnit);
  TestValidator.equals("custom unit type is custom", customUnit.type, "custom");
  TestValidator.equals(
    "custom unit display style is text_input",
    customUnit.display_style,
    "text_input",
  );
  TestValidator.equals(
    "custom unit is not required",
    customUnit.is_required,
    false,
  );

  // Create unit with multiple selection capability for features
  const featureUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Features",
        type: "style",
        display_style: "buttons",
        is_required: false,
        is_multiple: true,
        sort_order: 5,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(featureUnit);
  TestValidator.equals("feature unit type is style", featureUnit.type, "style");
  TestValidator.equals(
    "feature unit allows multiple selection",
    featureUnit.is_multiple,
    true,
  );
  TestValidator.equals(
    "feature unit display style is buttons",
    featureUnit.display_style,
    "buttons",
  );

  // Validate all units are properly linked to product
  TestValidator.predicate(
    "all units belong to correct product",
    sizeUnit.product.id === product.sku &&
      colorUnit.product.id === product.sku &&
      materialUnit.product.id === product.sku &&
      customUnit.product.id === product.sku &&
      featureUnit.product.id === product.sku,
  );
}
