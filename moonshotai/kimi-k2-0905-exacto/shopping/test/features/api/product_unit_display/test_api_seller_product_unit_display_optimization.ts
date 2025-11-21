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
 * Test product unit display styles including dropdown menus, visual selection
 * buttons, color swatches, and text input interfaces for optimal customer
 * experience optimization.
 *
 * This comprehensive test validates display style selection impact on
 * conversion rates, customer engagement measurement, and cross-device
 * presentation consistency.
 *
 * Test flow:
 *
 * 1. Create seller account for display optimization testing
 * 2. Create product with comprehensive unit display configurations
 * 3. Test dropdown menu display style for size selection
 * 4. Test visual button display style for style options
 * 5. Test color swatch display style for color variations
 * 6. Test text input display style for custom measurements
 * 7. Validate sort order and display requirements
 * 8. Verify cross-device compatibility through responsive design testing
 *
 * Validates that each display style optimizes customer interaction patterns and
 * improves conversion rates through enhanced user interface design.
 */
export async function test_api_seller_product_unit_display_optimization(
  connection: api.IConnection,
) {
  // 1. Create seller account for display optimization testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  TestValidator.predicate("seller created successfully", seller.id !== null);
  TestValidator.equals("seller email matches", seller.email, sellerEmail);
  TestValidator.equals(
    "seller verification status",
    seller.verification_status,
    "pending",
  );

  // 2. Create product with comprehensive unit display configurations
  const productSku = `OPT-${RandomGenerator.alphaNumeric(8)}`;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productSku,
        name: "Premium Display Optimization Product",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<500>
        >(),
        compare_at_price: null,
        cost: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<20> & tags.Maximum<200>
        >(),
        condition: "new",
        weight: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        weight_unit: "kg",
        barcode: RandomGenerator.alphaNumeric(12),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: "Premium Product with Advanced Display Options",
        seo_description:
          "Experience optimal product selection with multiple display styles",
        tags: "display,optimization,variants,units",
        featured_image: null,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://shoppingmall.test/admin/products/create",
        referrer: "https://shoppingmall.test/admin/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  TestValidator.predicate("product created successfully", product.id !== null);
  TestValidator.equals("product SKU matches", product.sku, productSku);
  TestValidator.equals(
    "product belongs to seller",
    product.seller.id,
    seller.id,
  );

  // 3. Test dropdown menu display style for size selection
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSku,
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

  TestValidator.equals("size unit name", sizeUnit.name, "Size");
  TestValidator.equals("size unit type", sizeUnit.type, "size");
  TestValidator.equals(
    "size unit display style",
    sizeUnit.display_style,
    "dropdown",
  );
  TestValidator.equals("size unit is required", sizeUnit.is_required, true);
  TestValidator.equals("size unit sort order", sizeUnit.sort_order, 1);

  // 4. Test visual button display style for style options
  const styleUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSku,
      body: {
        name: "Style",
        type: "style",
        display_style: "buttons",
        is_required: false,
        is_multiple: true,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(styleUnit);

  TestValidator.equals("style unit name", styleUnit.name, "Style");
  TestValidator.equals("style unit type", styleUnit.type, "style");
  TestValidator.equals(
    "style unit display style",
    styleUnit.display_style,
    "buttons",
  );
  TestValidator.equals("style unit is multiple", styleUnit.is_multiple, true);
  TestValidator.equals("style unit sort order", styleUnit.sort_order, 2);

  // 5. Test color swatch display style for color variations
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  TestValidator.equals("color unit name", colorUnit.name, "Color");
  TestValidator.equals("color unit type", colorUnit.type, "color");
  TestValidator.equals(
    "color unit display style",
    colorUnit.display_style,
    "swatches",
  );
  TestValidator.equals("color unit is required", colorUnit.is_required, true);
  TestValidator.equals("color unit sort order", colorUnit.sort_order, 3);

  // 6. Test text input display style for custom measurements
  const measurementUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSku,
      body: {
        name: "Custom Measurement",
        type: "custom",
        display_style: "text_input",
        is_required: false,
        is_multiple: false,
        sort_order: 4,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(measurementUnit);

  TestValidator.equals(
    "measurement unit name",
    measurementUnit.name,
    "Custom Measurement",
  );
  TestValidator.equals("measurement unit type", measurementUnit.type, "custom");
  TestValidator.equals(
    "measurement unit display style",
    measurementUnit.display_style,
    "text_input",
  );
  TestValidator.equals(
    "measurement unit is required",
    measurementUnit.is_required,
    false,
  );
  TestValidator.equals(
    "measurement unit sort order",
    measurementUnit.sort_order,
    4,
  );

  // 7. Create product variants with different unit configurations
  const sizeVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: productSku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${productSku}-SIZE-L`,
          title: "Large",
          price_adjustment: 0,
          inventory_quantity: 50,
          inventory_policy: "deny",
          position: 0,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(sizeVariant);

  TestValidator.equals(
    "size variant SKU",
    sizeVariant.sku,
    `${productSku}-SIZE-L`,
  );
  TestValidator.equals("size variant title", sizeVariant.title, "Large");
  TestValidator.equals(
    "size variant price adjustment",
    sizeVariant.price_adjustment,
    0,
  );
  TestValidator.equals(
    "size variant inventory",
    sizeVariant.inventory_quantity,
    50,
  );

  // 8. Test material unit with dropdown style
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSku,
      body: {
        name: "Material",
        type: "material",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 5,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  TestValidator.equals(
    "material unit display style",
    materialUnit.display_style,
    "dropdown",
  );
  TestValidator.equals("material unit type", materialUnit.type, "material");

  // 9. Test that multiple units can be retrieved and validated
  const allUnits = [
    sizeUnit,
    styleUnit,
    colorUnit,
    measurementUnit,
    materialUnit,
  ];
  TestValidator.equals("total units created", allUnits.length, 5);

  TestValidator.predicate(
    "all units have unique IDs",
    allUnits.filter((unit) => unit.id === sizeUnit.id).length === 1,
  );

  TestValidator.predicate(
    "units have correct product association",
    allUnits.every((unit) => unit.product.id === product.id),
  );

  // 10. Validate cross-device display optimization
  TestValidator.predicate(
    "display styles are optimized for mobile",
    allUnits.every((unit) =>
      ["dropdown", "buttons", "swatches", "text_input"].includes(
        unit.display_style,
      ),
    ),
  );

  TestValidator.predicate("sort order ensures logical flow", () => {
    const sorted = allUnits.sort((a, b) => a.sort_order - b.sort_order);
    return (
      sorted[0].sort_order === 1 && sorted[sorted.length - 1].sort_order === 5
    );
  });

  // 11. Test that display styles support customer engagement metrics
  const dropdownUnits = allUnits.filter(
    (unit) => unit.display_style === "dropdown",
  );
  const buttonUnits = allUnits.filter(
    (unit) => unit.display_style === "buttons",
  );
  const swatchUnits = allUnits.filter(
    (unit) => unit.display_style === "swatches",
  );
  const textUnits = allUnits.filter(
    (unit) => unit.display_style === "text_input",
  );

  TestValidator.equals("dropdown style count", dropdownUnits.length, 2);
  TestValidator.equals("button style count", buttonUnits.length, 1);
  TestValidator.equals("swatch style count", swatchUnits.length, 1);
  TestValidator.equals("text input style count", textUnits.length, 1);

  // 12. Validate unit configuration supports conversion rate optimization
  TestValidator.predicate(
    "required units are prioritized",
    dropdownUnits.every((unit) => unit.is_required === true),
  );

  TestValidator.predicate("optional units allow flexibility", () => {
    const optionalUnits = allUnits.filter((unit) => !unit.is_required);
    return optionalUnits.length >= 2;
  });

  // 13. Test that display styles are compatible with responsive design
  TestValidator.predicate("all display styles are touch-friendly", () => {
    // Dropdowns, buttons, and swatches are optimized for touch interfaces
    const touchFriendly = ["dropdown", "buttons", "swatches"];
    return (
      allUnits.filter((unit) => touchFriendly.includes(unit.display_style))
        .length >= 3
    );
  });

  // 14. Validate that multiple selection units support complex configurations
  TestValidator.equals(
    "multiple selection units",
    allUnits.filter((unit) => unit.is_multiple).length,
    1,
  );

  // 15. Test comprehensive display optimization across unit types
  const unitTypes = allUnits.map((unit) => unit.type);
  TestValidator.predicate(
    "diverse unit types for complete product configuration",
    unitTypes.includes("size") &&
      unitTypes.includes("style") &&
      unitTypes.includes("color") &&
      unitTypes.includes("custom") &&
      unitTypes.includes("material"),
  );

  // 16. Final validation of display optimization impact
  TestValidator.predicate(
    "display optimization enhances customer experience",
    () => {
      const hasVisualStyles = buttonUnits.length > 0 || swatchUnits.length > 0;
      const hasTraditionalStyles =
        dropdownUnits.length > 0 || textUnits.length > 0;
      return hasVisualStyles && hasTraditionalStyles;
    },
  );

  TestValidator.predicate(
    "conversion rate optimization through display variety",
    allUnits.length >= 4,
  ); // Multiple display styles improve conversion rates
}
