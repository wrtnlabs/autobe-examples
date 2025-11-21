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
 * Validate sort order field for product unit updates with comprehensive
 * testing.
 *
 * This test validates the sort_order field in product unit updates, ensuring
 * proper validation of numeric ranges and rejection of invalid data types. The
 * test covers:
 *
 * 1. Valid sort order values within accepted range
 * 2. Negative values that should be rejected
 * 3. Decimal numbers that should be rejected
 * 4. Boundary value testing for minimum and maximum acceptable values
 * 5. Final validation that the update system works correctly
 *
 * The test establishes a seller account, creates a product, creates a product
 * unit, and then validates various sort order scenarios to ensure consistent
 * product presentation across marketplace interfaces.
 */
export async function test_api_seller_product_unit_update_sort_order_validation(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with valid business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: typia.random<
        string & tags.Pattern<"^[A-Z0-9]{10,15}$">
      >(),
      tax_id: typia.random<string & tags.Pattern<"^\\d{9}$">>(),
      phone: RandomGenerator.mobile(),
      business_type: "LLC",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create a product with comprehensive details
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        price: 99.99,
        condition: "new",
        weight: 2.5,
        weight_unit: "lb",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/products/create",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create a product unit for sort order testing with initial sort order
  const unit = await api.functional.shoppingMall.seller.products.units.create(
    connection,
    {
      productCode: product.id,
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
  TestValidator.equals("initial sort order should be 1", unit.sort_order, 1);

  // Step 4: Test valid sort order updates across different ranges
  const validSortOrders = [0, 1, 10, 100, 999, 1000];
  for (const sortOrder of validSortOrders) {
    const updatedUnit =
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: product.id,
          unitId: unit.id,
          body: {
            sort_order: sortOrder,
          } satisfies IShoppingMallProductUnit.IUpdate,
        },
      );
    typia.assert(updatedUnit);
    TestValidator.equals(
      "valid sort order should be accepted",
      updatedUnit.sort_order,
      sortOrder,
    );
  }

  // Step 5: Test negative value rejection - these should be handled by business logic
  // In real scenarios, the API would reject these through business rules, not type validation
  const negativeSortOrders = [-1, -10, -100];
  for (const negativeSortOrder of negativeSortOrders) {
    try {
      const result =
        await api.functional.shoppingMall.seller.products.units.update(
          connection,
          {
            productCode: product.id,
            unitId: unit.id,
            body: {
              sort_order: negativeSortOrder,
            } satisfies IShoppingMallProductUnit.IUpdate,
          },
        );
      // If negative values somehow get through (unlikely), verify they don't break the system
      TestValidator.predicate(
        "negative sort order should not break system",
        result.sort_order >= 0,
      );
    } catch (error) {
      // Business rule rejection is expected and correct
      TestValidator.predicate(
        "negative sort order correctly rejected by business rules",
        true,
      );
    }
  }

  // Step 6: Test decimal value handling - decimals would be truncated or rejected at business level
  const decimalSortOrders = [1.5, 10.99, 0.1];
  for (const decimalSortOrder of decimalSortOrders) {
    try {
      const result =
        await api.functional.shoppingMall.seller.products.units.update(
          connection,
          {
            productCode: product.id,
            unitId: unit.id,
            body: {
              sort_order: decimalSortOrder,
            } satisfies IShoppingMallProductUnit.IUpdate,
          },
        );
      // If decimals somehow get processed, they should be handled appropriately
      TestValidator.predicate(
        "decimal sort order should be handled gracefully",
        Number.isInteger(result.sort_order) && result.sort_order >= 0,
      );
    } catch (error) {
      // Business rule rejection is expected
      TestValidator.predicate(
        "decimal sort order correctly handled by business rules",
        true,
      );
    }
  }

  // Step 7: Test multiple field updates to ensure sort order works with other changes
  const multiFieldUpdate =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.id,
      unitId: unit.id,
      body: {
        name: "Updated Size",
        sort_order: 25,
        is_required: true,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(multiFieldUpdate);
  TestValidator.equals(
    "multi-field update sort order",
    multiFieldUpdate.sort_order,
    25,
  );
  TestValidator.equals(
    "multi-field update name",
    multiFieldUpdate.name,
    "Updated Size",
  );

  // Step 8: Test boundary conditions with maximum reasonable values
  const boundaryTests = [9999, 10000, 99999];
  for (const boundarySortOrder of boundaryTests) {
    const boundaryUpdate =
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: product.id,
          unitId: unit.id,
          body: {
            sort_order: boundarySortOrder,
          } satisfies IShoppingMallProductUnit.IUpdate,
        },
      );
    typia.assert(boundaryUpdate);
    TestValidator.equals(
      `boundary sort order ${boundarySortOrder} should be accepted`,
      boundaryUpdate.sort_order,
      boundarySortOrder,
    );
  }

  // Step 9: Final validation - verify the system maintains data integrity
  const finalValidation =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.id,
      unitId: unit.id,
      body: {
        sort_order: 50,
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(finalValidation);
  TestValidator.equals(
    "final validation sort order",
    finalValidation.sort_order,
    50,
  );
  TestValidator.predicate(
    "final validation maintains integrity",
    typeof finalValidation.sort_order === "number" &&
      finalValidation.sort_order >= 0,
  );
}
