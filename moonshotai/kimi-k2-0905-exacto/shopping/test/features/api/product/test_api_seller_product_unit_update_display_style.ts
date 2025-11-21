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
 * Test changing unit display style from dropdown to visual interfaces.
 *
 * This test validates that sellers can modify how units appear to customers
 * including changing from dropdown menus to button selections, color swatches,
 * or text input fields. It tests that style changes integrate properly with
 * existing customer selections and product variant configurations without
 * disrupting active transactions.
 *
 * Test Steps:
 *
 * 1. Register and authenticate seller account
 * 2. Create a product for testing display style configurations
 * 3. Create product unit with initial dropdown display style
 * 4. Update unit display style to visual button selection
 * 5. Update unit display style to color swatch interface
 * 6. Update unit display style to text input field
 * 7. Validate display style changes are properly applied
 * 8. Ensure changes integrate properly with existing configurations
 */
export async function test_api_seller_product_unit_update_display_style(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphabets(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create product for testing
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: "UNIT-TEST-PRODUCT",
        name: "Display Style Test Product",
        description: RandomGenerator.content({ paragraphs: 3 }),
        price: 99.99,
        condition: "new",
        weight: 1.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/product/form",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product unit with dropdown display style
  const unit = await api.functional.shoppingMall.seller.products.units.create(
    connection,
    {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    },
  );
  typia.assert(unit);

  TestValidator.equals(
    "initial display style is dropdown",
    unit.display_style,
    "dropdown",
  );

  // Step 4: Update display style to visual buttons
  const unitWithButtons =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: unit.id,
      body: {
        display_style: "buttons",
        name: "Color Selection",
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(unitWithButtons);

  TestValidator.equals(
    "display style updated to buttons",
    unitWithButtons.display_style,
    "buttons",
  );
  TestValidator.equals(
    "name updated successfully",
    unitWithButtons.name,
    "Color Selection",
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    unitWithButtons.updated_at,
    unit.updated_at,
  );

  // Step 5: Update display style to color swatches
  const unitWithSwatches =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: unit.id,
      body: {
        display_style: "swatches",
        is_required: false,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(unitWithSwatches);

  TestValidator.equals(
    "display style updated to swatches",
    unitWithSwatches.display_style,
    "swatches",
  );
  TestValidator.equals(
    "required status updated",
    unitWithSwatches.is_required,
    false,
  );

  // Step 6: Update display style to text input
  const unitWithTextInput =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: unit.id,
      body: {
        display_style: "text_input",
        is_multiple: true,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(unitWithTextInput);

  TestValidator.equals(
    "display style updated to text_input",
    unitWithTextInput.display_style,
    "text_input",
  );
  TestValidator.equals(
    "multiple selection enabled",
    unitWithTextInput.is_multiple,
    true,
  );

  // Step 7: Validate final unit configuration
  const finalUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: unit.id,
      body: {
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
        type: "size",
        name: "Size",
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(finalUnit);

  TestValidator.equals(
    "final display style is dropdown",
    finalUnit.display_style,
    "dropdown",
  );
  TestValidator.equals("unit type updated to size", finalUnit.type, "size");
  TestValidator.equals("unit name updated to Size", finalUnit.name, "Size");
  TestValidator.equals(
    "required status reset to true",
    finalUnit.is_required,
    true,
  );
  TestValidator.equals(
    "multiple selection reset to false",
    finalUnit.is_multiple,
    false,
  );
  TestValidator.equals("sort order updated to 2", finalUnit.sort_order, 2);
}
