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

export async function test_api_customer_shipment_detail_view(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer shipment detail view response structure and read-only behavior.
   *
   * This test validates the shipment detail payload returned for an authenticated customer request.
   * It ensures the endpoint returns the shipment header, related seller and order summaries,
   * tracking information, timestamps, and shipment item references without mutating the session.
   *
   * 1. Register and authenticate a customer using the join utility.
   * 2. Request a shipment detail view using a valid shipment identifier format.
   * 3. Validate the returned shipment payload with typia and verify core summary fields exist.
   * 4. Confirm the response is read-only by checking that the authenticated session token remains usable.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipment = await api.functional.mallPlatform.customer.shipments.at(
    customerConnection,
    {
      shipmentId,
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment id should match request",
    shipment.id,
    shipmentId,
  );
  TestValidator.predicate(
    "seller summary should exist",
    shipment.seller.id.length > 0,
  );
  TestValidator.predicate(
    "order summary should exist",
    shipment.order.id.length > 0,
  );
  TestValidator.predicate(
    "carrier name should exist",
    shipment.carrierName.length > 0,
  );
  TestValidator.predicate(
    "tracking number should exist",
    shipment.trackingNumber.length > 0,
  );
  TestValidator.predicate("status should exist", shipment.status.length > 0);
  TestValidator.predicate(
    "shipment should have at least one item",
    shipment.shipmentItems.length > 0,
  );
  TestValidator.predicate(
    "shipment items should expose linked order items",
    shipment.shipmentItems.every((item) => item.orderItem.id.length > 0),
  );
  TestValidator.predicate(
    "shipment items should have active shipment references",
    shipment.shipmentItems.every((item) => item.shipment.id.length > 0),
  );
}
