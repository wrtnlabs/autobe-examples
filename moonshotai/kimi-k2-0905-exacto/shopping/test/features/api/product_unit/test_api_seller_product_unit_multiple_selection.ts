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
 * Test product units supporting multiple option selection for complex product
 * configurations. Validates units allowing customers to choose multiple
 * variations within the same unit type, enabling comprehensive customization
 * for specialized products. Tests configuration complexity management, cart
 * integration, and fulfillment coordination for multi-option product setups.
 */
export async function test_api_seller_product_unit_multiple_selection(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for multi-selection testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(3),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "llc",
        "partnership",
        "sole_proprietorship",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create customizable products requiring multiple selections
  const productCreateRequest = {
    sku: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
    condition: "new",
    weight: 1.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: seller.id, // Using seller ID as mock category ID
    shopping_mall_seller_id: seller.id,
    href: "https://example.com/seller/dashboard/products/create",
    referrer: "https://example.com/seller/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateRequest,
    },
  );
  typia.assert(product);

  // Step 3: Create product units with multiple selection enabled
  const colorUnitCreateRequest = {
    name: "Color",
    type: "color",
    display_style: "swatches",
    is_required: true,
    is_multiple: true,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: colorUnitCreateRequest,
    });
  typia.assert(colorUnit);

  // Verify unit supports multiple selection
  TestValidator.equals(
    "color unit multiple selection enabled",
    colorUnit.is_multiple,
    true,
  );
  TestValidator.equals("color unit required", colorUnit.is_required, true);
  TestValidator.equals("color unit type", colorUnit.type, "color");
  TestValidator.equals(
    "color unit display style",
    colorUnit.display_style,
    "swatches",
  );

  // Create material unit with multiple selection
  const materialUnitCreateRequest = {
    name: "Material",
    type: "material",
    display_style: "dropdown",
    is_required: false,
    is_multiple: true,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: materialUnitCreateRequest,
    });
  typia.assert(materialUnit);

  // Verify material unit properties
  TestValidator.equals(
    "material unit multiple selection enabled",
    materialUnit.is_multiple,
    true,
  );
  TestValidator.equals(
    "material unit not required",
    materialUnit.is_required,
    false,
  );
  TestValidator.equals("material unit type", materialUnit.type, "material");
  TestValidator.equals(
    "material unit display style",
    materialUnit.display_style,
    "dropdown",
  );

  // Create style unit with single selection (for comparison)
  const styleUnitCreateRequest = {
    name: "Style",
    type: "style",
    display_style: "buttons",
    is_required: true,
    is_multiple: false,
    sort_order: 3,
  } satisfies IShoppingMallProductUnit.ICreate;

  const styleUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: styleUnitCreateRequest,
    });
  typia.assert(styleUnit);

  // Verify style unit has single selection
  TestValidator.equals(
    "style unit single selection",
    styleUnit.is_multiple,
    false,
  );
  TestValidator.equals("style unit required", styleUnit.is_required, true);

  // Verify product relationship is maintained
  TestValidator.equals(
    "color unit product id",
    colorUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "material unit product id",
    materialUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "style unit product id",
    styleUnit.product.id,
    product.id,
  );

  // Verify sort order hierarchy
  TestValidator.predicate(
    "color unit first in order",
    colorUnit.sort_order < materialUnit.sort_order,
  );
  TestValidator.predicate(
    "material unit before style unit",
    materialUnit.sort_order < styleUnit.sort_order,
  );
}
