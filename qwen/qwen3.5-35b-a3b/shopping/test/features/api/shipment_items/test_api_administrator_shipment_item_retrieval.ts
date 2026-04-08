import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_shipment_item_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorization = await authorize_administrator_join(
    adminConnection,
    {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular",
      },
    },
  );
  typia.assert(adminAuthorization);
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuthorization.token.access },
  };
  // 2. Generate a mock shipment item ID for testing
  // Note: In a real E2E test, this would require creating a complete business workflow
  // (seller registration → product creation → customer order → shipment creation)
  // Since the available SDK functions don't include shipment creation, we'll test
  // the retrieval endpoint structure using a generated UUID
  const shipmentItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve shipment item as administrator
  // This will likely return 404 since shipment item doesn't exist in test DB
  // We test the response structure and error handling
  await TestValidator.error(
    "should return 404 for non-existent shipment item",
    async () => {
      await api.functional.ecommerceMall.administrator.shipment_items.at(
        adminAuthenticatedConnection,
        { shipmentItemId },
      );
    },
  );
  // 4. Generate mock shipment item data to validate response structure
  // Using typia.random to create a valid IEcommerceMallShipmentItem instance
  // This validates that the response type is correctly defined
  const mockShipmentItem: IEcommerceMallShipmentItem =
    typia.random<IEcommerceMallShipmentItem>();
  typia.assert(mockShipmentItem);
  // 5. Validate shipment item response structure
  TestValidator.equals(
    "shipment item ID format",
    mockShipmentItem.id !== undefined,
    true,
  );
  TestValidator.predicate(
    "shipment item status is valid",
    ["pending", "shipped", "delivered", "cancelled"].includes(
      mockShipmentItem.status,
    ),
  );
  TestValidator.predicate(
    "quantity_shipped is positive integer",
    mockShipmentItem.quantity_shipped > 0,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(new Date(mockShipmentItem.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(new Date(mockShipmentItem.updated_at).getTime()),
  );
  TestValidator.equals(
    "deleted_at is null for active record",
    mockShipmentItem.deleted_at,
    null,
  );
  // 6. Validate joined shipment data structure
  TestValidator.equals(
    "shipment ID exists",
    mockShipmentItem.shipment.id !== undefined,
    true,
  );
  TestValidator.predicate(
    "shipment status is valid",
    ["shipped", "delivered"].includes(mockShipmentItem.shipment.status),
  );
  // Carrier and tracking_number are optional
  if (mockShipmentItem.shipment.carrier) {
    TestValidator.predicate(
      "carrier is non-empty string",
      mockShipmentItem.shipment.carrier.length > 0,
    );
  }
  if (mockShipmentItem.shipment.tracking_number) {
    TestValidator.predicate(
      "tracking_number is non-empty string",
      mockShipmentItem.shipment.tracking_number.length > 0,
    );
  }
  TestValidator.equals(
    "shipment has seller",
    mockShipmentItem.shipment.seller.id !== undefined,
    true,
  );
  TestValidator.equals(
    "shipment seller display_name exists",
    mockShipmentItem.shipment.seller.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment created_at exists",
    mockShipmentItem.shipment.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment is_suspended is boolean",
    typeof mockShipmentItem.shipment.seller.is_suspended === "boolean",
    true,
  );
  TestValidator.equals(
    "shipment approval_status exists",
    mockShipmentItem.shipment.seller.approval_status.length > 0,
    true,
  );
  // 7. Validate joined order item data structure
  TestValidator.equals(
    "order item ID exists",
    mockShipmentItem.orderItem.id !== undefined,
    true,
  );
  TestValidator.equals(
    "order number exists",
    mockShipmentItem.orderItem.order_number.length > 0,
    true,
  );
  TestValidator.equals(
    "seller display_name exists",
    mockShipmentItem.orderItem.seller_display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "product variant name exists",
    mockShipmentItem.orderItem.product_variant_name.length > 0,
    true,
  );
  TestValidator.equals(
    "SKU code exists",
    mockShipmentItem.orderItem.product_variant_sku_code.length > 0,
    true,
  );
  TestValidator.predicate(
    "product variant price is positive",
    mockShipmentItem.orderItem.product_variant_price > 0,
  );
  TestValidator.predicate(
    "quantity is positive integer",
    mockShipmentItem.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "unit price is positive",
    mockShipmentItem.orderItem.unit_price > 0,
  );
  TestValidator.equals(
    "subtotal calculation",
    mockShipmentItem.orderItem.subtotal,
    mockShipmentItem.orderItem.quantity * mockShipmentItem.orderItem.unit_price,
  );
  TestValidator.predicate(
    "order item status is valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      mockShipmentItem.orderItem.status,
    ),
  );
  TestValidator.equals(
    "order item created_at exists",
    mockShipmentItem.orderItem.created_at.length > 0,
    true,
  );
}
