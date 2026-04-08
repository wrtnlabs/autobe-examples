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

export async function test_api_customer_shipment_tracking_access_control_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies customer shipment tracking access control and missing-record behavior.
   *
   * This test ensures shipment tracking is not exposed across customer ownership
   * boundaries and that non-existent shipment identifiers are treated as not
   * found rather than returning stale tracking data.
   *
   * 1. Create two authenticated customer sessions.
   * 2. Load a real order for one customer and obtain a persisted shipment id.
   * 3. Confirm another customer cannot read that shipment tracking record.
   * 4. Confirm a missing shipment id is treated as not found.
   */
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerA);
  const order = await api.functional.mallPlatform.customer.orders.at(
    customerAConnection,
    {
      orderId: customerA.id as string & tags.Format<"uuid">,
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "customer order detail should expose shipment history for persisted records",
    order.shipments.length > 0,
  );
  const shipment = order.shipments[0];
  typia.assert(shipment);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerB);
  await TestValidator.httpError(
    "other customer cannot access shipment tracking",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.shipments.tracking.at(
        customerBConnection,
        {
          shipmentId: shipment.id,
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing shipment id is treated as not found",
    404,
    async () => {
      await api.functional.mallPlatform.customer.shipments.tracking.at(
        customerAConnection,
        {
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
