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
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWarehouse";

/**
 * Test comprehensive initial stock validation system for inventory level
 * creation.
 *
 * This test validates the sophisticated inventory management system that
 * enables sellers to establish comprehensive stock tracking with proper
 * allocation between available, reserved, and allocated quantities. The system
 * ensures business accuracy through real-time inventory state management and
 * prevents negative stock scenarios.
 *
 * Business Context:
 *
 * - E-commerce marketplace requires precise inventory tracking across multiple
 *   warehouse locations
 * - Sellers need to manage stock distributions for pending orders (reserved) and
 *   confirmed orders (allocated)
 * - System must prevent overselling while maintaining accurate availability for
 *   customers
 * - Multi-variant products require granular inventory control at the SKU level
 *
 * Test Flow:
 *
 * 1. Register seller account with comprehensive business verification
 * 2. Create product with multiple variants for inventory testing
 * 3. Establish warehouse facilities for multi-location stock management
 * 4. Create initial inventory levels with various stock distribution scenarios
 * 5. Validate stock reconciliation preventing negative inventory states
 * 6. Test reserved stock allocation for pending customer orders
 * 7. Verify allocated stock configuration for confirmed order fulfillment
 * 8. Confirm current stock balance calculation accuracy
 * 9. Validate real-time inventory state initialization
 * 10. Test multi-location inventory tracking across warehouse facilities
 *
 * Key Validations:
 *
 * - Current stock must be >= reserved stock + allocated stock
 * - Negative stock prevention through system constraints
 * - Stock balance integrity across all inventory movements
 * - Real-time inventory state accuracy for business operations
 * - Multi-variant SKU-level tracking precision
 * - Multi-warehouse location distribution validation
 */
export async function test_api_inventory_level_initial_stock_validation(
  connection: api.IConnection,
) {
  // Step 1: Register seller for inventory management operations
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  TestValidator.predicate("seller registration successful", seller.id !== null);
  TestValidator.equals("seller email matches", seller.email, sellerEmail);

  // Step 2: Create product with variants for inventory testing
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 4,
          wordMax: 8,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        condition: "new",
        weight: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: [],
        images: [],
        href: "https://seller-dashboard.example.com/products/create",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create multiple product variants for comprehensive inventory testing
  const variants = await ArrayUtil.asyncRepeat(3, async (index) => {
    return await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          sku: `${product.sku}-VAR${index + 1}`,
          title: `${RandomGenerator.pick(["Small", "Medium", "Large"])} - ${RandomGenerator.pick(["Black", "White", "Blue"])}`,
          price_adjustment: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<500>
          >(),
          inventory_quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<500>
          >(),
          inventory_policy: RandomGenerator.pick(["deny", "continue"] as const),
          position: index,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  });

  // Step 4: Create initial inventory levels with various stock distribution scenarios
  const warehouse1: IShoppingMallWarehouse.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: "Main Distribution Center",
    code: "MDC-001",
    location: "New York, NY",
    status: "active",
    total_capacity: 100000,
    available_capacity: 75000,
  };

  const warehouse2: IShoppingMallWarehouse.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: "Regional Fulfillment Center",
    code: "RFC-002",
    location: "Los Angeles, CA",
    status: "active",
    total_capacity: 80000,
    available_capacity: 60000,
  };

  // Scenario 1: Normal inventory with balanced stock distribution
  const inventory1 =
    await api.functional.shoppingMall.seller.inventoryLevels.create(
      connection,
      {
        body: {
          productVariant: {
            id: variants[0].id,
            sku: variants[0].sku,
            title: variants[0].title,
            price_adjustment: variants[0].price_adjustment,
            inventory_quantity: variants[0].inventory_quantity,
            is_active: variants[0].is_active,
          },
          warehouse: warehouse1,
          currentStock: 100,
          reservedStock: 10,
          allocatedStock: 5,
          reorderPoint: 20,
          restockQuantity: 50,
        } satisfies IShoppingMallInventoryLevels.ICreate,
      },
    );
  typia.assert(inventory1);

  // Validate stock balance integrity
  TestValidator.equals(
    "current stock calculation valid",
    inventory1.currentStock,
    100,
  );
  TestValidator.equals(
    "reserved stock set correctly",
    inventory1.reservedStock,
    10,
  );
  TestValidator.equals(
    "allocated stock configured",
    inventory1.allocatedStock,
    5,
  );
  TestValidator.predicate(
    "stock balance integrity maintained",
    inventory1.currentStock >=
      inventory1.reservedStock + inventory1.allocatedStock,
  );

  // Scenario 2: High-reserve inventory for popular items
  const inventory2 =
    await api.functional.shoppingMall.seller.inventoryLevels.create(
      connection,
      {
        body: {
          productVariant: {
            id: variants[1].id,
            sku: variants[1].sku,
            title: variants[1].title,
            price_adjustment: variants[1].price_adjustment,
            inventory_quantity: variants[1].inventory_quantity,
            is_active: variants[1].is_active,
          },
          warehouse: warehouse1,
          currentStock: 200,
          reservedStock: 45,
          allocatedStock: 30,
          reorderPoint: 50,
          restockQuantity: 100,
        } satisfies IShoppingMallInventoryLevels.ICreate,
      },
    );
  typia.assert(inventory2);

  TestValidator.equals(
    "high current stock for popular item",
    inventory2.currentStock,
    200,
  );
  TestValidator.equals(
    "high reserved stock scenario",
    inventory2.reservedStock,
    45,
  );
  TestValidator.equals(
    "allocated stock for confirmed orders",
    inventory2.allocatedStock,
    30,
  );
  TestValidator.predicate(
    "high-reserve stock balance valid",
    inventory2.currentStock >=
      inventory2.reservedStock + inventory2.allocatedStock,
  );

  // Scenario 3: Multi-warehouse inventory distribution
  const inventory3 =
    await api.functional.shoppingMall.seller.inventoryLevels.create(
      connection,
      {
        body: {
          productVariant: {
            id: variants[2].id,
            sku: variants[2].sku,
            title: variants[2].title,
            price_adjustment: variants[2].price_adjustment,
            inventory_quantity: variants[2].inventory_quantity,
            is_active: variants[2].is_active,
          },
          warehouse: warehouse2,
          currentStock: 150,
          reservedStock: 25,
          allocatedStock: 15,
          reorderPoint: 30,
          restockQuantity: 75,
        } satisfies IShoppingMallInventoryLevels.ICreate,
      },
    );
  typia.assert(inventory3);

  // Scenario 4: Edge case - zero reserved stock for new items
  const inventory4 =
    await api.functional.shoppingMall.seller.inventoryLevels.create(
      connection,
      {
        body: {
          productVariant: {
            id: variants[0].id,
            sku: variants[0].sku,
            title: variants[0].title,
            price_adjustment: variants[0].price_adjustment,
            inventory_quantity: variants[0].inventory_quantity,
            is_active: variants[0].is_active,
          },
          warehouse: {
            id: typia.random<string & tags.Format<"uuid">>(),
            name: "Backup Storage Facility",
            code: "BSF-003",
            location: "Chicago, IL",
            status: "active",
            total_capacity: 50000,
            available_capacity: 40000,
          },
          currentStock: 75,
          reservedStock: 0,
          allocatedStock: 0,
          reorderPoint: 15,
          restockQuantity: 40,
        } satisfies IShoppingMallInventoryLevels.ICreate,
      },
    );
  typia.assert(inventory4);

  TestValidator.equals(
    "zero reserved stock scenario",
    inventory4.reservedStock,
    0,
  );
  TestValidator.equals(
    "zero allocated stock scenario",
    inventory4.allocatedStock,
    0,
  );
  TestValidator.equals(
    "pure current stock tracking",
    inventory4.currentStock,
    75,
  );

  // Scenario 5: Complex stock distribution with capacity constraints
  const inventory5 =
    await api.functional.shoppingMall.seller.inventoryLevels.create(
      connection,
      {
        body: {
          productVariant: {
            id: variants[1].id,
            sku: variants[1].sku,
            title: variants[1].title,
            price_adjustment: variants[1].price_adjustment,
            inventory_quantity: variants[1].inventory_quantity,
            is_active: variants[1].is_active,
          },
          warehouse: warehouse2,
          currentStock: 300,
          reservedStock: 80,
          allocatedStock: 65,
          totalCapacity: 500,
          reorderPoint: 100,
          restockQuantity: 150,
        } satisfies IShoppingMallInventoryLevels.ICreate,
      },
    );
  typia.assert(inventory5);

  TestValidator.equals("high capacity inventory", inventory5.currentStock, 300);
  TestValidator.equals(
    "significant reserved allocation",
    inventory5.reservedStock,
    80,
  );
  TestValidator.equals("large allocated stock", inventory5.allocatedStock, 65);
  TestValidator.equals(
    "capacity constraint applied",
    inventory5.totalCapacity,
    500,
  );
  TestValidator.predicate(
    "capacity utilization reasonable",
    inventory5.currentStock <=
      (inventory5.totalCapacity ?? inventory5.currentStock),
  );

  // Validate comprehensive business rules across all scenarios
  const allInventories = [
    inventory1,
    inventory2,
    inventory3,
    inventory4,
    inventory5,
  ];

  TestValidator.predicate(
    "multiple inventory scenarios created",
    allInventories.length === 5,
  );

  // Verify seller ownership across all inventory records
  for (const inventory of allInventories) {
    TestValidator.equals(
      "inventory seller ID consistency",
      inventory.seller.id,
      seller.id,
    );
    TestValidator.equals(
      "inventory variant SKU present",
      inventory.productVariant.sku.length > 0,
      true,
    );
    TestValidator.equals(
      "warehouse code present",
      inventory.warehouse.code.length > 0,
      true,
    );
  }

  // Validate inventory state consistency and business logic
  let totalCurrentStock = 0;
  let totalReservedStock = 0;
  let totalAllocatedStock = 0;

  for (const inventory of allInventories) {
    totalCurrentStock += inventory.currentStock;
    totalReservedStock += inventory.reservedStock;
    totalAllocatedStock += inventory.allocatedStock;

    // Core business rule validation
    TestValidator.predicate(
      "current stock >= reserved + allocated stock",
      inventory.currentStock >=
        inventory.reservedStock + inventory.allocatedStock,
    );

    // Reorder point validation
    TestValidator.predicate(
      "reorder point less than current stock",
      inventory.reorderPoint < inventory.currentStock,
    );

    // Restock quantity validation
    TestValidator.predicate(
      "positive restock quantity",
      inventory.restockQuantity > 0,
    );

    // Warehouse capacity validation
    if (inventory.totalCapacity !== undefined) {
      TestValidator.predicate(
        "current stock within capacity limits",
        inventory.currentStock <= inventory.totalCapacity,
      );
    }
  }

  TestValidator.predicate(
    "total current stock positive",
    totalCurrentStock > 0,
  );
  TestValidator.predicate(
    "total reserved stock non-negative",
    totalReservedStock >= 0,
  );
  TestValidator.predicate(
    "total allocated stock non-negative",
    totalAllocatedStock >= 0,
  );
  TestValidator.predicate(
    "overall stock distribution valid",
    totalCurrentStock >= totalReservedStock + totalAllocatedStock,
  );

  // Test timestamp and lifecycle validation
  TestValidator.predicate(
    "creation timestamps present",
    allInventories.every(
      (inv) => inv.createdAt !== null && inv.createdAt !== undefined,
    ),
  );
  TestValidator.predicate(
    "update timestamps present",
    allInventories.every(
      (inv) => inv.updatedAt !== null && inv.updatedAt !== undefined,
    ),
  );

  // Validate chronological ordering
  for (const inventory of allInventories) {
    TestValidator.predicate(
      "update timestamp after creation timestamp",
      new Date(inventory.updatedAt).getTime() >=
        new Date(inventory.createdAt).getTime(),
    );
  }

  // Validate multi-variant inventory tracking
  const variantInventoryMap = new Map<string, number[]>();
  for (const inventory of allInventories) {
    const variantId = inventory.productVariant.id;
    if (!variantInventoryMap.has(variantId)) {
      variantInventoryMap.set(variantId, []);
    }
    variantInventoryMap.get(variantId)!.push(inventory.currentStock);
  }

  TestValidator.predicate(
    "multi-variant tracking enabled",
    variantInventoryMap.size > 1,
  );

  // Validate each variant has appropriate inventory distribution
  for (const [variantId, stockLevels] of variantInventoryMap) {
    TestValidator.predicate(
      `variant ${variantId} has inventory tracking`,
      stockLevels.length > 0,
    );
    TestValidator.predicate(
      `variant ${variantId} has positive stock`,
      stockLevels.some((level) => level > 0),
    );
  }

  // Test real-time inventory state validation
  TestValidator.predicate(
    "inventory states track real stock movements",
    allInventories.some(
      (inv) => inv.reservedStock > 0 || inv.allocatedStock > 0,
    ),
  );
  TestValidator.predicate(
    "inventory supports zero-reserve scenarios",
    allInventories.some(
      (inv) => inv.reservedStock === 0 && inv.allocatedStock === 0,
    ),
  );
  TestValidator.predicate(
    "inventory supports capacity-constrained scenarios",
    allInventories.some((inv) => inv.totalCapacity !== undefined),
  );
}
