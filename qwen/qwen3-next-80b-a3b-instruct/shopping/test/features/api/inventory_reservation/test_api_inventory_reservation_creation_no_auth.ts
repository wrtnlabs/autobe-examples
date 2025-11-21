import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import type { IShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryUnit";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_inventory_reservation_creation_no_auth(
  connection: api.IConnection,
) {
  // Test reservation creation rejection when no authentication is provided
  // An unauthenticated user attempts to create a reservation directly.
  // The system requires a valid customer token and returns a 401 Unauthorized error,
  // confirming that reservation creation is restricted to authenticated users only.

  // Create minimal valid IShoppingMallInventoryReservation.ICreate structure
  // Based on DTO definition: inventoryUnit must be IShoppingMallInventoryUnit.ISummary
  // seller property is a string type (as per IShoppingMallSeller.ISummary)
  // Required properties for IShoppingMallInventoryUnit.ISummary:
  const inventoryUnit: IShoppingMallInventoryUnit.ISummary = {
    product_variant: {
      id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.name(2),
      price: 50.99,
      sku: RandomGenerator.alphaNumeric(8),
      inventory_count: 10,
      attributes: '{"size":"M","color":"blue"}',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    seller: "seller-123", // IShoppingMallSeller.ISummary is string type
    quantity: 10,
    min_stock_threshold: 5,
    warehouse_location: "Tokyo Warehouse",
  };

  // Required properties for IShoppingMallOrderItem.ISummary:
  const orderItem: IShoppingMallOrderItem.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    productId: typia.random<string & tags.Format<"uuid">>(),
    variantId: typia.random<string & tags.Format<"uuid">>(),
    quantity: 2,
    unitPrice: 50.99,
    totalAmount: 101.98,
  };

  // Create reservation request with minimal valid data
  const reservationData: IShoppingMallInventoryReservation.ICreate = {
    inventoryUnit,
    orderItem,
    quantity: 2,
  };

  // Test that reservation creation fails when no authentication is provided
  // The system requires a valid customer token
  // An unauthenticated user attempting to create a reservation should be rejected
  // with a 401 Unauthorized error
  await TestValidator.error(
    "unauthenticated user should be rejected when creating reservation",
    async () => {
      // Call API with unauthenticated connection
      await api.functional.shoppingMall.customer.inventory.reservations.create(
        connection, // Use connection as-is (no headers manipulation)
        { body: reservationData },
      );
    },
  );
}
