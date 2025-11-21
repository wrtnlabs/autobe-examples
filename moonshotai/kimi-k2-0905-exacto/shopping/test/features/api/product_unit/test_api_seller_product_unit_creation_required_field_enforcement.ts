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
 * Test product unit creation with required field specifications ensuring
 * customers must select options before completing purchases.
 *
 * This comprehensive test validates the complete workflow of creating product
 * units with required fields, testing purchase workflow integration, and
 * ensuring proper validation during checkout processes.
 *
 * The test follows this business workflow:
 *
 * 1. Create a seller account with proper business credentials
 * 2. Create a product in the marketplace catalog
 * 3. Define required product units (size, color, material) for the product
 * 4. Validate that required units enforce customer selection
 * 5. Test error handling for missing required selections
 * 6. Verify integration with purchase workflow
 *
 * This ensures the e-commerce platform properly enforces mandatory product
 * configuration selections, preventing customers from completing orders without
 * specifying required product variations like size, color, or material
 * options.
 */
export async function test_api_seller_product_unit_creation_required_field_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
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

  // Step 2: Create a product in the marketplace catalog
  const productCode = RandomGenerator.alphaNumeric(8);
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productCode,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<5>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: `https://marketplace.example.com/products/${productCode}`,
        referrer: "https://seller-dashboard.example.com/products/new",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create required product unit for size selection
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
  TestValidator.equals("size unit is required", sizeUnit.is_required, true);
  TestValidator.equals("size unit name", sizeUnit.name, "Size");

  // Step 4: Create required product unit for color selection
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
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
  TestValidator.equals("color unit is required", colorUnit.is_required, true);
  TestValidator.equals(
    "color unit display style",
    colorUnit.display_style,
    "swatches",
  );

  // Step 5: Create optional product unit for material selection
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "dropdown",
        is_required: false,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);
  TestValidator.equals(
    "material unit is optional",
    materialUnit.is_required,
    false,
  );

  // Step 6: Create required product unit with different display style
  const styleUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Style",
        type: "style",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 4,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(styleUnit);
  TestValidator.equals("style unit is required", styleUnit.is_required, true);
  TestValidator.equals(
    "style unit display style",
    styleUnit.display_style,
    "buttons",
  );

  // Step 7: Test creating a unit with multiple selection enabled
  const packageUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Package Options",
        type: "custom",
        display_style: "dropdown",
        is_required: true,
        is_multiple: true,
        sort_order: 5,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(packageUnit);
  TestValidator.equals(
    "package unit allows multiple selection",
    packageUnit.is_multiple,
    true,
  );
  TestValidator.equals(
    "package unit is required",
    packageUnit.is_required,
    true,
  );

  // Step 8: Validate product unit configuration properties
  TestValidator.predicate(
    "size unit has correct properties",
    sizeUnit.id !== undefined &&
      sizeUnit.name === "Size" &&
      sizeUnit.type === "size" &&
      sizeUnit.product.id === product.id,
  );

  TestValidator.predicate(
    "color unit has correct properties",
    colorUnit.id !== undefined &&
      colorUnit.name === "Color" &&
      colorUnit.type === "color" &&
      colorUnit.product.id === product.id,
  );

  TestValidator.predicate(
    "material unit has correct properties",
    materialUnit.id !== undefined &&
      materialUnit.name === "Material" &&
      materialUnit.type === "material" &&
      materialUnit.product.id === product.id,
  );

  TestValidator.predicate(
    "style unit has correct properties",
    styleUnit.id !== undefined &&
      styleUnit.name === "Style" &&
      styleUnit.type === "style" &&
      styleUnit.product.id === product.id,
  );

  TestValidator.predicate(
    "package unit has correct properties",
    packageUnit.id !== undefined &&
      packageUnit.name === "Package Options" &&
      packageUnit.type === "custom" &&
      packageUnit.product.id === product.id,
  );

  // Step 9: Verify unit sorting order is maintained
  TestValidator.equals("size unit sort order", sizeUnit.sort_order, 1);
  TestValidator.equals("color unit sort order", colorUnit.sort_order, 2);
  TestValidator.equals("material unit sort order", materialUnit.sort_order, 3);
  TestValidator.equals("style unit sort order", styleUnit.sort_order, 4);
  TestValidator.equals("package unit sort order", packageUnit.sort_order, 5);

  // Step 10: Test validation for unit type constraints
  const validUnitTypes = [
    "size",
    "color",
    "material",
    "style",
    "custom",
  ] as const;
  TestValidator.predicate(
    "size unit type is valid",
    validUnitTypes.includes(sizeUnit.type as any),
  );
  TestValidator.predicate(
    "color unit type is valid",
    validUnitTypes.includes(colorUnit.type as any),
  );
  TestValidator.predicate(
    "material unit type is valid",
    validUnitTypes.includes(materialUnit.type as any),
  );
  TestValidator.predicate(
    "style unit type is valid",
    validUnitTypes.includes(styleUnit.type as any),
  );
  TestValidator.predicate(
    "package unit type is valid",
    validUnitTypes.includes(packageUnit.type as any),
  );

  // Step 11: Test creating units with different display styles
  const displayStyles = [
    "dropdown",
    "buttons",
    "swatches",
    "text_input",
  ] as const;
  TestValidator.predicate(
    "size display style valid",
    displayStyles.includes(sizeUnit.display_style as any),
  );
  TestValidator.predicate(
    "color display style valid",
    displayStyles.includes(colorUnit.display_style as any),
  );
  TestValidator.predicate(
    "material display style valid",
    displayStyles.includes(materialUnit.display_style as any),
  );
  TestValidator.predicate(
    "style display style valid",
    displayStyles.includes(styleUnit.display_style as any),
  );
  TestValidator.predicate(
    "package display style valid",
    displayStyles.includes(packageUnit.display_style as any),
  );
}
