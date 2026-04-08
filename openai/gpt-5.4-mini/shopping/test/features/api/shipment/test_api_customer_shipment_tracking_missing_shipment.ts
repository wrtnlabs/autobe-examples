import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify missing shipment tracking returns not found for an authenticated customer.
 *
 * This test covers the customer shipment tracking flow when the requested shipment identifier
 * does not match any existing shipment record. It first creates an authenticated customer
 * context, then requests tracking details for a random UUID that should not exist in storage.
 *
 * The expected business behavior is a 404 not-found response and no shipment tracking payload
 * for nonexistent data.
 *
 * 1. Register and authenticate a customer account.
 * 2. Request shipment tracking using a nonexistent shipment identifier.
 * 3. Verify that the API responds with a not-found HTTP error.
 */
export async function test_api_customer_shipment_tracking_missing_shipment(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await TestValidator.httpError(
    "customer shipment tracking should return 404 for a missing shipment",
    404,
    async () => {
      await api.functional.mallPlatform.customer.shipments.tracking.at(
        customerConnection,
        {
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
