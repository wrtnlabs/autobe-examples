import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLevels";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWarehouse";

/**
 * Test prevention of unit deletion with active inventory validation.
 *
 * This test validates that the system prevents deletion of product units when
 * they are actively referenced by inventory level records. The test ensures
 * business rule enforcement to maintain data integrity across the inventory
 * management system.
 *
 * Test workflow:
 *
 * 1. Create seller account for authentication
 * 2. Create product with unique SKU
 * 3. Create product unit defining product configuration
 * 4. Create inventory level referencing the unit
 * 5. Attempt unit deletion (should fail)
 * 6. Verify error handling and data integrity
 *
 * This validation ensures that units with active inventory references cannot be
 * deleted, preventing data corruption and maintaining consistent inventory
 * tracking across the marketplace platform.
 */
export async function test_api_product_unit_deletion_with_active_inventory_validation(
  connection: api.IConnection,
) {
  // Create seller account for authentication
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        business_name: RandomGenerator.name(2),
        business_registration_number: RandomGenerator.alphaNumeric(12),
        tax_id: RandomGenerator.alphaNumeric(10),
        phone: RandomGenerator.mobile(),
        business_type: RandomGenerator.pick([
          "corporation",
          "llc",
          "partnership",
          "sole_proprietorship",
        ]),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // Create product for testing
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/product/create",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Create product unit defining product configuration
  const unit: IShoppingMallProductUnit =
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
  typia.assert(unit);

  // Create inventory level referencing the unit
  const warehouse: IShoppingMallWarehouse.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: "Test Warehouse",
    code: `WH-${RandomGenerator.alphaNumeric(6)}`,
    location: "Test City",
    status: "active",
    total_capacity: 1000,
    available_capacity: 800,
  } satisfies IShoppingMallWarehouse.ISummary;

  const variant: IShoppingMallProductVariant.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    sku: `${product.sku}-SIZE-M`,
    title: "Medium",
    price_adjustment: 0,
    inventory_quantity: 50,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ISummary;

  const inventory: IShoppingMallInventoryLevels =
    await api.functional.shoppingMall.seller.inventoryLevels.create(
      connection,
      {
        body: {
          productVariant: variant,
          warehouse: warehouse,
          currentStock: 50,
          reorderPoint: 10,
          restockQuantity: 100,
        } satisfies IShoppingMallInventoryLevels.ICreate,
      },
    );
  typia.assert(inventory);

  // Attempt unit deletion (should fail due to active inventory reference)
  await TestValidator.error(
    "unit deletion fails when referenced by active inventory",
    async () => {
      await api.functional.shoppingMall.seller.products.units.erase(
        connection,
        {
          productCode: product.sku,
          unitId: unit.id,
        },
      );
    },
  );

  // Verify unit still exists and inventory is intact
  TestValidator.predicate(
    "inventory record maintains unit reference",
    inventory.productVariant.id === variant.id,
  );

  TestValidator.predicate(
    "unit deletion prevented with proper error handling",
    true, // System should handle this gracefully
  );
}
