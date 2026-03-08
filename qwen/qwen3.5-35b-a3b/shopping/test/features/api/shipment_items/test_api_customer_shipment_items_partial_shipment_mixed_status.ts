import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_items_partial_shipment_mixed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  // 2. Retrieve customer orders to find order
  const ordersResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          limit: 10,
          page: 1,
          sortBy: "created_at" as const,
          sortOrder: "DESC" as const,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(ordersResponse);
  // Validate orders exist
  TestValidator.predicate(
    "customer has orders",
    ordersResponse.data.length > 0,
  );
  // Get first order to work with
  const order = ordersResponse.data[0];
  typia.assert(order);
  // 3. Retrieve shipments for the order
  const shipmentsResponse =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          orderId: order.id,
          limit: 20,
          sortBy: "createdAt" as const,
          sortOrder: "desc" as const,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(shipmentsResponse);
  // Validate shipments exist for the order
  TestValidator.predicate(
    "order has shipments",
    shipmentsResponse.data.length > 0,
  );
  // Get first shipment to examine items
  const shipment = shipmentsResponse.data[0];
  typia.assert(shipment);
  // 4. Retrieve shipment items for the shipment
  const shipmentItems =
    await api.functional.ecommerceMall.customer.shipmentItems.items.getItems(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(shipmentItems);
  // 5. Validate shipment items response - handle both single item and array cases
  const itemsArray = Array.isArray(shipmentItems)
    ? shipmentItems
    : [shipmentItems];
  typia.assert(itemsArray as IEcommerceMallShipmentItem.ISummary[]);
  // Test empty array edge case
  if (itemsArray.length === 0) {
    TestValidator.equals("empty shipment items array", itemsArray.length, 0);
    return;
  }
  // Validate items are ordered by created_at ascending
  for (let i = 1; i < itemsArray.length; i++) {
    const currentItem = itemsArray[i];
    const previousItem = itemsArray[i - 1];
    typia.assert(currentItem);
    typia.assert(previousItem);
    TestValidator.predicate(
      `item ${i} created_at >= previous item`,
      currentItem.created_at >= previousItem.created_at,
    );
  }
  // Validate each shipment item has correct structure and data
  for (const item of itemsArray) {
    typia.assert(item);
    // Validate item structure fields exist
    TestValidator.equals("shipment item id type", typeof item.id, "string");
    TestValidator.equals(
      "shipment item has shipment reference",
      item.shipment !== undefined,
      true,
    );
    TestValidator.equals(
      "shipment item has orderItem reference",
      item.orderItem !== undefined,
      true,
    );
    TestValidator.equals(
      "shipment item created_at type",
      typeof item.created_at,
      "string",
    );
    TestValidator.equals(
      "shipment item updated_at type",
      typeof item.updated_at,
      "string",
    );
    // Validate shipment reference includes carrier and tracking
    typia.assert(item.shipment);
    TestValidator.equals(
      "shipment has carrier name",
      item.shipment.carrier_name.length > 0,
      true,
    );
    TestValidator.equals(
      "shipment has tracking number",
      item.shipment.tracking_number.length > 0,
      true,
    );
    // Validate order item reference includes essential fields
    typia.assert(item.orderItem);
    TestValidator.equals(
      "order item has correct status for shipped",
      item.orderItem.itemStatus === "shipped",
      true,
    );
    TestValidator.equals(
      "order item has quantity greater than zero",
      item.orderItem.quantity > 0,
      true,
    );
    TestValidator.equals(
      "order item has unit price greater than zero",
      item.orderItem.unitPrice > 0,
      true,
    );
    // Validate snapshot data exists and is valid JSON
    TestValidator.equals(
      "order item has product snapshot",
      item.orderItem.productSnapshot.length > 0,
      true,
    );
    TestValidator.equals(
      "order item has variant snapshot",
      item.orderItem.variantSnapshot.length > 0,
      true,
    );
    TestValidator.equals(
      "order item has seller profile snapshot",
      item.orderItem.sellerProfileSnapshot.length > 0,
      true,
    );
    // Parse snapshots to ensure they are valid JSON
    JSON.parse(item.orderItem.productSnapshot);
    JSON.parse(item.orderItem.variantSnapshot);
    JSON.parse(item.orderItem.sellerProfileSnapshot);
  }
}
