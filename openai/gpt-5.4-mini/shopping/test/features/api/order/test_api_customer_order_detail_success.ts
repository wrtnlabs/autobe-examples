import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order detail retrieval for a preserved historical purchase record.
 *
 * Validates that an authenticated customer can open an order detail view and receive the full order payload. The response must preserve checkout-time shipping information and include item and shipment collections so the historical purchase record can be rendered consistently.
 *
 * This test focuses on the read-only customer order detail endpoint and verifies that the response is tied to the authenticated customer connection. It also checks the top-level preserved shipping destination and the presence of item and shipment collections for fulfillment history.
 *
 * 1. Register a customer account and authenticate with an isolated customer connection.
 * 2. Request the customer order detail endpoint with a UUID-shaped order identifier.
 * 3. Validate the returned order header, preserved shipping destination, and nested collections.
 * 4. Confirm the order detail payload is structurally sound for customer history rendering.
 */
export async function test_api_customer_order_detail_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const order = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(order);
  TestValidator.equals(
    "customer id should match authenticated account",
    order.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email should match authenticated account",
    order.customer.email,
    customer.email,
  );
  TestValidator.predicate(
    "order number should be present",
    order.orderNumber.length > 0,
  );
  TestValidator.predicate(
    "order status should be present",
    order.status.length > 0,
  );
  TestValidator.predicate(
    "total amount should be non-negative",
    order.totalAmount >= 0,
  );
  TestValidator.predicate(
    "recipient name should be present",
    order.recipientName.length > 0,
  );
  TestValidator.predicate(
    "recipient phone should be present",
    order.recipientPhone.length > 0,
  );
  TestValidator.predicate(
    "street address should be present",
    order.streetAddress.length > 0,
  );
  TestValidator.predicate("city should be present", order.city.length > 0);
  TestValidator.predicate(
    "state province should be present",
    order.stateProvince.length > 0,
  );
  TestValidator.predicate(
    "postal code should be present",
    order.postalCode.length > 0,
  );
  TestValidator.predicate(
    "country should be present",
    order.country.length > 0,
  );
  TestValidator.predicate(
    "order should contain item or shipment history",
    order.orderItems.length > 0 || order.shipments.length > 0,
  );
  for (const item of order.orderItems) {
    TestValidator.equals(
      "order item should belong to the same order",
      item.order.id,
      order.id,
    );
    TestValidator.predicate(
      "order item quantity should be positive",
      item.quantity > 0,
    );
    TestValidator.predicate(
      "order item status should be present",
      item.status.length > 0,
    );
  }
  for (const shipment of order.shipments) {
    TestValidator.equals(
      "shipment should belong to the same order",
      shipment.order.id,
      order.id,
    );
    TestValidator.predicate(
      "shipment carrier name should be present",
      shipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "shipment tracking number should be present",
      shipment.trackingNumber.length > 0,
    );
    TestValidator.predicate(
      "shipment status should be present",
      shipment.status.length > 0,
    );
    TestValidator.predicate(
      "shipment should contain at least one shipment item",
      shipment.shipmentItems.length > 0,
    );
  }
}
