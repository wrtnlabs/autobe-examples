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
 * Test partial update of unit configuration modifying only selected fields.
 * Validate that sellers can update specific unit properties without affecting
 * other configuration settings. Test that omitted fields retain their existing
 * values while updated fields receive new values, ensuring granular control
 * over unit configuration management with minimal system impact.
 */
export async function test_api_seller_product_unit_update_partial_configuration(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "sole_proprietorship",
        "corporation",
        "llc",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create a product with comprehensive configuration
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        compare_at_price: null,
        cost: typia.random<number & tags.Minimum<5> & tags.Maximum<500>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        barcode: null,
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: null,
        seo_description: null,
        tags: null,
        featured_image: null,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/products/create",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create a fully-configured unit for testing
  const unit = await api.functional.shoppingMall.seller.products.units.create(
    connection,
    {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    },
  );
  typia.assert(unit);

  // Store original values for comparison
  const originalName = unit.name;
  const originalType = unit.type;
  const originalDisplayStyle = unit.display_style;
  const originalIsRequired = unit.is_required;
  const originalIsMultiple = unit.is_multiple;
  const originalSortOrder = unit.sort_order;

  // Step 4: Test partial update - modify only name and display_style
  const updatedUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: unit.id,
      body: {
        name: "Updated Size",
        display_style: "buttons",
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(updatedUnit);

  // Step 5: Validate partial update results
  // Updated fields should have new values
  TestValidator.equals("updated unit name", updatedUnit.name, "Updated Size");
  TestValidator.equals(
    "updated unit display_style",
    updatedUnit.display_style,
    "buttons",
  );

  // Non-updated fields should retain original values
  TestValidator.equals("unit type unchanged", updatedUnit.type, originalType);
  TestValidator.equals(
    "unit is_required unchanged",
    updatedUnit.is_required,
    originalIsRequired,
  );
  TestValidator.equals(
    "unit is_multiple unchanged",
    updatedUnit.is_multiple,
    originalIsMultiple,
  );
  TestValidator.equals(
    "unit sort_order unchanged",
    updatedUnit.sort_order,
    originalSortOrder,
  );

  // Step 6: Test another partial update - modify only is_required and sort_order
  const secondUpdate =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: unit.id,
      body: {
        is_required: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(secondUpdate);

  // Step 7: Validate second partial update
  // Fields updated in first call should remain changed
  TestValidator.equals(
    "name persists from first update",
    secondUpdate.name,
    "Updated Size",
  );
  TestValidator.equals(
    "display_style persists from first update",
    secondUpdate.display_style,
    "buttons",
  );

  // Fields updated in second call should be changed
  TestValidator.equals("is_required updated", secondUpdate.is_required, false);
  TestValidator.equals("sort_order updated", secondUpdate.sort_order, 2);

  // Fields not updated in either call should retain original values
  TestValidator.equals("unit type unchanged", secondUpdate.type, originalType);
  TestValidator.equals(
    "unit is_multiple unchanged",
    secondUpdate.is_multiple,
    originalIsMultiple,
  );

  // Step 8: Verify that unit ID and product relationship remain intact
  TestValidator.equals("unit ID unchanged", secondUpdate.id, unit.id);
  TestValidator.equals(
    "product ID unchanged",
    secondUpdate.product.id,
    product.id,
  );

  // Step 9: Test empty update (no changes) - should not affect any fields
  const emptyUpdate =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: unit.id,
      body: {} satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(emptyUpdate);

  // All fields should remain exactly as they were after second update
  TestValidator.equals(
    "empty update preserves name",
    emptyUpdate.name,
    "Updated Size",
  );
  TestValidator.equals(
    "empty update preserves display_style",
    emptyUpdate.display_style,
    "buttons",
  );
  TestValidator.equals(
    "empty update preserves is_required",
    emptyUpdate.is_required,
    false,
  );
  TestValidator.equals(
    "empty update preserves sort_order",
    emptyUpdate.sort_order,
    2,
  );
  TestValidator.equals(
    "empty update preserves type",
    emptyUpdate.type,
    originalType,
  );
  TestValidator.equals(
    "empty update preserves is_multiple",
    emptyUpdate.is_multiple,
    originalIsMultiple,
  );
}
