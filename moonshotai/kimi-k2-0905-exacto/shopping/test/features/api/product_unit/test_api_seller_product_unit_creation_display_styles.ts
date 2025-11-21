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
 * Test product unit creation with different display styles including dropdowns,
 * buttons, swatches, and text input interfaces. Validates optimal user
 * interface selection based on unit type characteristics for enhanced customer
 * product customization experiences.
 *
 * The test follows this workflow:
 *
 * 1. Create a seller account for authentication
 * 2. Create a product to add units to
 * 3. Create product units with different display styles:
 *
 *    - Dropdown display style for size selection
 *    - Button display style for color selection
 *    - Swatch display style for material/fabric selection
 *    - Text input display style for custom measurements
 * 4. Validate that each unit is created with the correct display style and
 *    properties
 */
export async function test_api_seller_product_unit_creation_display_styles(
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
      business_type: RandomGenerator.pick([
        "sole proprietorship",
        "corporation",
        "llc",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create a product to add units to
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/products/new",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product units with different display styles

  // Create dropdown unit for size selection
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

  TestValidator.equals(
    "size unit display style should be dropdown",
    sizeUnit.display_style,
    "dropdown",
  );
  TestValidator.equals("size unit type should be size", sizeUnit.type, "size");
  TestValidator.equals(
    "size unit should be required",
    sizeUnit.is_required,
    true,
  );
  TestValidator.equals(
    "size unit sort order should be 1",
    sizeUnit.sort_order,
    1,
  );

  // Create button unit for color selection
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

  TestValidator.equals(
    "color unit display style should be buttons",
    colorUnit.display_style,
    "buttons",
  );
  TestValidator.equals(
    "color unit type should be color",
    colorUnit.type,
    "color",
  );
  TestValidator.equals(
    "color unit should be required",
    colorUnit.is_required,
    true,
  );
  TestValidator.equals(
    "color unit sort order should be 2",
    colorUnit.sort_order,
    2,
  );

  // Create swatch unit for material selection
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "swatches",
        is_required: false,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  TestValidator.equals(
    "material unit display style should be swatches",
    materialUnit.display_style,
    "swatches",
  );
  TestValidator.equals(
    "material unit type should be material",
    materialUnit.type,
    "material",
  );
  TestValidator.equals(
    "material unit should not be required",
    materialUnit.is_required,
    false,
  );
  TestValidator.equals(
    "material unit sort order should be 3",
    materialUnit.sort_order,
    3,
  );

  // Create text input unit for custom measurements
  const measurementUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Custom Measurement",
        type: "custom",
        display_style: "text_input",
        is_required: false,
        is_multiple: true,
        sort_order: 4,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(measurementUnit);

  TestValidator.equals(
    "measurement unit display style should be text_input",
    measurementUnit.display_style,
    "text_input",
  );
  TestValidator.equals(
    "measurement unit type should be custom",
    measurementUnit.type,
    "custom",
  );
  TestValidator.equals(
    "measurement unit should not be required",
    measurementUnit.is_required,
    false,
  );
  TestValidator.equals(
    "measurement unit should allow multiple",
    measurementUnit.is_multiple,
    true,
  );
  TestValidator.equals(
    "measurement unit sort order should be 4",
    measurementUnit.sort_order,
    4,
  );

  // Validate product relationship integrity
  TestValidator.equals(
    "size unit product ID should match",
    sizeUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "color unit product ID should match",
    colorUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "material unit product ID should match",
    materialUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "measurement unit product ID should match",
    measurementUnit.product.id,
    product.id,
  );
}
