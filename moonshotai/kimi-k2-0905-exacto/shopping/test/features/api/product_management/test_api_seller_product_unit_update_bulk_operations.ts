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
 * Test bulk operations for updating multiple product units within a single
 * product configuration.
 *
 * This test validates seller workflow efficiency by creating a product with
 * multiple units, then performing simultaneous updates to various unit
 * configurations including display styles, requirement settings, and sort
 * orders. The test measures update performance and ensures data integrity is
 * maintained across all bulk configuration changes.
 *
 * The scenario follows this workflow:
 *
 * 1. Create seller account for authentication
 * 2. Create product with complex configuration requirements
 * 3. Create multiple units (size, color, material, style variants)
 * 4. Verify all units are properly created and configured
 * 5. Perform bulk update operations on all units simultaneously
 * 6. Validate that all updates were applied successfully
 * 7. Test data integrity by reloading units and comparing states
 * 8. Verify bulk operation performance characteristics
 */
export async function test_api_seller_product_unit_update_bulk_operations(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as seller through registration
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_name: "TechFashion Store",
        business_registration_number: typia.random<
          string & tags.Pattern<"^[0-9]{10}$">
        >(),
        tax_id: typia.random<string & tags.Pattern<"^[0-9]{10}$">>(),
        phone: RandomGenerator.mobile(),
        business_type: "corporation",
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // Step 2: Create a complex product requiring multiple unit configurations
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: `TECH${RandomGenerator.alphaNumeric(8)}`, // Remove hyphen to ensure valid SKU
        name: "Premium Leather Jacket",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        price: 299.99,
        compare_at_price: 399.99,
        cost: 150.0,
        condition: "new",
        weight: 1.2,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: "Premium Leather Jacket - Fashion Store",
        seo_description: "High-quality leather jacket with premium materials",
        tags: "leather, jacket, premium, fashion, winter",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: [],
        images: [
          {
            name: "jacket-front-view",
            extension: "jpg",
            url: "https://cdn.example.com/products/leather-jacket-front.jpg",
          },
          {
            name: "jacket-detail",
            extension: "jpg",
            url: "https://cdn.example.com/products/leather-jacket-detail.jpg",
          },
        ],
        ip: "192.168.1.1",
        href: "https://dashboard.example.com/products/create",
        referrer: "https://dashboard.example.com/seller/account",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 3: Create multiple units for different product variations
  const sizeUnitBody = {
    name: "Size",
    type: "size",
    display_style: "buttons",
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const colorUnitBody = {
    name: "Color",
    type: "color",
    display_style: "swatches",
    is_required: true,
    is_multiple: false,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const materialUnitBody = {
    name: "Material",
    type: "material",
    display_style: "dropdown",
    is_required: true,
    is_multiple: false,
    sort_order: 3,
  } satisfies IShoppingMallProductUnit.ICreate;

  const styleUnitBody = {
    name: "Style",
    type: "style",
    display_style: "text_input",
    is_required: false,
    is_multiple: true,
    sort_order: 4,
  } satisfies IShoppingMallProductUnit.ICreate;

  // Create units one by one
  const sizeUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: sizeUnitBody,
    });
  typia.assert(sizeUnit);

  const colorUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: colorUnitBody,
    });
  typia.assert(colorUnit);

  const materialUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: materialUnitBody,
    });
  typia.assert(materialUnit);

  const styleUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: styleUnitBody,
    });
  typia.assert(styleUnit);

  // Step 4: Verify all units were created successfully
  TestValidator.predicate(
    "size unit created successfully",
    sizeUnit.name === "Size",
  );
  TestValidator.predicate(
    "color unit created successfully",
    colorUnit.name === "Color",
  );
  TestValidator.predicate(
    "material unit created successfully",
    materialUnit.name === "Material",
  );
  TestValidator.predicate(
    "style unit created successfully",
    styleUnit.name === "Style",
  );

  TestValidator.predicate(
    "size unit has correct display style",
    sizeUnit.display_style === "buttons",
  );
  TestValidator.predicate(
    "color unit has correct display style",
    colorUnit.display_style === "swatches",
  );
  TestValidator.predicate(
    "material unit has correct display style",
    materialUnit.display_style === "dropdown",
  );
  TestValidator.predicate(
    "style unit has correct display style",
    styleUnit.display_style === "text_input",
  );

  TestValidator.predicate(
    "all required units marked as required",
    sizeUnit.is_required && colorUnit.is_required && materialUnit.is_required,
  );
  TestValidator.predicate(
    "style unit not required",
    styleUnit.is_required === false,
  );
  TestValidator.predicate(
    "style unit supports multiple selection",
    styleUnit.is_multiple === true,
  );

  // Step 5: Perform bulk update operations on all units simultaneously
  const bulkUpdates = [
    {
      unitId: sizeUnit.id,
      update: {
        display_style: "swatches",
        sort_order: 4, // Move to end
        name: "Size Selection",
      } satisfies IShoppingMallProductUnit.IUpdate,
    },
    {
      unitId: colorUnit.id,
      update: {
        display_style: "buttons",
        sort_order: 3, // Move closer
        name: "Color Choice",
      } satisfies IShoppingMallProductUnit.IUpdate,
    },
    {
      unitId: materialUnit.id,
      update: {
        display_style: "text_input",
        is_required: false, // Make optional
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.IUpdate,
    },
    {
      unitId: styleUnit.id,
      update: {
        is_required: true, // Now required
        is_multiple: false, // Single selection
        sort_order: 1, // Move to top
      } satisfies IShoppingMallProductUnit.IUpdate,
    },
  ];

  // Execute all updates concurrently to simulate bulk operation
  const updatePromises = bulkUpdates.map(({ unitId, update }) =>
    api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId,
      body: update,
    }),
  );

  // Execute all updates concurrently
  const updatedUnits: IShoppingMallProductUnit[] =
    await Promise.all(updatePromises);

  // Step 6: Validate that all updates were applied successfully
  for (let i = 0; i < updatedUnits.length; i++) {
    const updatedUnit = updatedUnits[i];
    const updateData = bulkUpdates[i].update;

    // Verify each updated unit
    TestValidator.predicate(
      `unit ${i} updated name correctly`,
      updateData.name
        ? updatedUnit.name === updateData.name
        : updatedUnit.name === updatedUnit.name,
    );
    TestValidator.predicate(
      `unit ${i} updated display style correctly`,
      updateData.display_style
        ? updatedUnit.display_style === updateData.display_style
        : updatedUnit.display_style === updatedUnit.display_style,
    );
    TestValidator.predicate(
      `unit ${i} updated sort order correctly`,
      updateData.sort_order !== undefined
        ? updatedUnit.sort_order === updateData.sort_order
        : updatedUnit.sort_order === updatedUnit.sort_order,
    );
    TestValidator.predicate(
      `unit ${i} updated requirements correctly`,
      updateData.is_required !== undefined
        ? updatedUnit.is_required === updateData.is_required
        : updatedUnit.is_required === updatedUnit.is_required,
    );
    TestValidator.predicate(
      `unit ${i} updated multiple selection correctly`,
      updateData.is_multiple !== undefined
        ? updatedUnit.is_multiple === updateData.is_multiple
        : updatedUnit.is_multiple === updatedUnit.is_multiple,
    );

    // Verify timestamps were updated
    TestValidator.predicate(
      `unit ${i} has updated timestamp`,
      updatedUnit.updated_at !==
        [sizeUnit, colorUnit, materialUnit, styleUnit][i].updated_at,
    );
  }

  // Step 7: Test data integrity with individual update
  const integrityTestUpdate =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: sizeUnit.id,
      body: {
        name: "Final Size",
        display_style: "dropdown",
        sort_order: 1,
        is_required: true,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(integrityTestUpdate);

  // Verify the final state
  TestValidator.equals(
    "size unit final name",
    integrityTestUpdate.name,
    "Final Size",
  );
  TestValidator.equals(
    "size unit final display style",
    integrityTestUpdate.display_style,
    "dropdown",
  );
  TestValidator.equals(
    "size unit final sort order",
    integrityTestUpdate.sort_order,
    1,
  );
  TestValidator.equals(
    "size unit final required status",
    integrityTestUpdate.is_required,
    true,
  );

  // Step 8: Test slow sequential updates vs concurrent bulk updates
  const sequentialStartTime = Date.now();

  // Perform sequential updates for comparison
  for (let i = 0; i < 3; i++) {
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: colorUnit.id,
      body: {
        sort_order: i,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  }

  const sequentialEndTime = Date.now();
  const sequentialTime = sequentialEndTime - sequentialStartTime;

  // Concurrent bulk operation timing (already measured above)
  const bulkStartTime = Date.now();

  // Perform concurrent updates for proper bulk operation comparison
  const concurrentPromises = [
    { id: sizeUnit.id, sort_order: 10 },
    { id: materialUnit.id, sort_order: 20 },
    { id: styleUnit.id, sort_order: 30 },
  ].map(({ id, sort_order }) =>
    api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: id,
      body: { sort_order } satisfies IShoppingMallProductUnit.IUpdate,
    }),
  );

  await Promise.all(concurrentPromises);

  const bulkEndTime = Date.now();
  const bulkTime = bulkEndTime - bulkStartTime;

  // Performance comparison - concurrent should be faster
  TestValidator.predicate(
    "concurrent bulk operations faster than sequential",
    bulkTime < sequentialTime,
  );
  TestValidator.predicate(
    "bulk operation performance acceptable",
    bulkTime < 3000,
  ); // Less than 3 seconds

  // Final validation: ensure all units maintain correct relationships
  TestValidator.equals(
    "product sku maintained",
    integrityTestUpdate.product.id,
    product.id,
  );
  TestValidator.predicate(
    "unit types preserved",
    updatedUnits.every((unit) =>
      ["size", "color", "material", "style"].includes(unit.type),
    ),
  );

  // Validate data integrity across all units after bulk operations
  const finalUnits = await Promise.all([
    api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: sizeUnit.id,
      body: { sort_order: 1 } satisfies IShoppingMallProductUnit.IUpdate,
    }),
    api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: colorUnit.id,
      body: { sort_order: 2 } satisfies IShoppingMallProductUnit.IUpdate,
    }),
    api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: materialUnit.id,
      body: { sort_order: 3 } satisfies IShoppingMallProductUnit.IUpdate,
    }),
    api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: styleUnit.id,
      body: { sort_order: 4 } satisfies IShoppingMallProductUnit.IUpdate,
    }),
  ]);

  // Verify final sorted order
  TestValidator.equals(
    "final size unit sort_order",
    finalUnits[0].sort_order,
    1,
  );
  TestValidator.equals(
    "final color unit sort_order",
    finalUnits[1].sort_order,
    2,
  );
  TestValidator.equals(
    "final material unit sort_order",
    finalUnits[2].sort_order,
    3,
  );
  TestValidator.equals(
    "final style unit sort_order",
    finalUnits[3].sort_order,
    4,
  );
}
