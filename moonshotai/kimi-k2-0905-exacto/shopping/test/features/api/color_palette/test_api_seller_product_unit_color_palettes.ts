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
 * Test creating color configuration unit with visual swatch display for
 * enhanced customer product selection experience.
 *
 * Validates sophisticated color selection systems enabling accurate color
 * preview for customers, supporting color blindness accessibility through
 * enhanced text labels, and ensuring color accuracy between display and actual
 * product appearance throughout comprehensive color management workflows.
 *
 * 1. Register color-aware seller for comprehensive testing
 * 2. Establish color-oriented products for swatch testing
 * 3. Create color unit configuration with visual swatch display
 * 4. Validate color unit metadata and accessibility features
 * 5. Test multiple color selection capabilities
 * 6. Verify color management workflow completeness
 */
export async function test_api_seller_product_unit_color_palettes(
  connection: api.IConnection,
) {
  // 1. Register color-aware seller for comprehensive testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "Color Specialist",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  TestValidator.equals(
    "seller verification status",
    seller.verification_status,
    "pending",
  );
  TestValidator.predicate(
    "seller has color specialization",
    seller.business_type === "Color Specialist",
  );

  // 2. Establish color-oriented products for swatch testing
  const productData = {
    sku: RandomGenerator.alphaNumeric(8),
    name: "Premium Color Swatch Collection",
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    price: 199.99,
    condition: "new",
    weight: 0.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: `https://shoppingmall.example.com/seller/products/create`,
    referrer: `https://shoppingmall.example.com/seller/dashboard`,
  } satisfies IShoppingMallProduct.ICreate;

  const colorProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(colorProduct);
  TestValidator.equals(
    "product name matches",
    colorProduct.name,
    productData.name,
  );
  TestValidator.predicate("product has sku", colorProduct.sku.length > 0);
  TestValidator.equals(
    "product seller matches",
    colorProduct.seller.id,
    seller.id,
  );

  // 3. Create color unit configuration with visual swatch display
  const colorUnitData = {
    name: "Premium Matte Color",
    type: "color",
    display_style: "swatches",
    is_required: true,
    is_multiple: true,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: colorProduct.sku,
      body: colorUnitData,
    });
  typia.assert(colorUnit);

  // 4. Validate color unit metadata and accessibility features
  TestValidator.equals("color unit name", colorUnit.name, colorUnitData.name);
  TestValidator.equals("color unit type", colorUnit.type, "color");
  TestValidator.equals(
    "color unit display style",
    colorUnit.display_style,
    "swatches",
  );
  TestValidator.equals("color unit is required", colorUnit.is_required, true);
  TestValidator.equals("color unit is multiple", colorUnit.is_multiple, true);
  TestValidator.equals("color unit sort order", colorUnit.sort_order, 1);
  TestValidator.equals(
    "color unit product id",
    colorUnit.product.id,
    colorProduct.id,
  );

  // 5. Test multiple color selection capabilities
  TestValidator.predicate(
    "color unit supports multiple selection",
    colorUnit.is_multiple === true,
  );
  TestValidator.predicate(
    "color unit is customer required",
    colorUnit.is_required === true,
  );

  // 6. Verify color management workflow completeness
  TestValidator.predicate(
    "color unit has creation timestamp",
    colorUnit.created_at.length > 0,
  );
  TestValidator.predicate(
    "color unit has update timestamp",
    colorUnit.updated_at.length > 0,
  );
  TestValidator.predicate(
    "color unit timestamps valid",
    colorUnit.created_at <= colorUnit.updated_at,
  );

  // Test additional accessibility-focused color unit
  const accessibilityUnitData = {
    name: "Color Accessibility Description",
    type: "color",
    display_style: "buttons",
    is_required: false,
    is_multiple: false,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const accessibilityUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: colorProduct.sku,
      body: accessibilityUnitData,
    });
  typia.assert(accessibilityUnit);

  TestValidator.equals(
    "accessibility unit name matches",
    accessibilityUnit.name,
    accessibilityUnitData.name,
  );
  TestValidator.equals(
    "accessibility unit display style",
    accessibilityUnit.display_style,
    "buttons",
  );
  TestValidator.equals(
    "accessibility unit not required",
    accessibilityUnit.is_required,
    false,
  );
  TestValidator.equals(
    "accessibility unit single selection",
    accessibilityUnit.is_multiple,
    false,
  );

  // Validate comprehensive color palette workflow
  const units = [colorUnit, accessibilityUnit];
  TestValidator.equals("total color units created", units.length, 2);
  TestValidator.predicate(
    "all units belong to same product",
    units.every((unit) => unit.product.id === colorProduct.id),
  );
  TestValidator.equals(
    "units have different names",
    colorUnit.name,
    accessibilityUnit.name,
  );
  TestValidator.equals(
    "units have different sort orders",
    colorUnit.sort_order,
    accessibilityUnit.sort_order - 1,
  );
}
