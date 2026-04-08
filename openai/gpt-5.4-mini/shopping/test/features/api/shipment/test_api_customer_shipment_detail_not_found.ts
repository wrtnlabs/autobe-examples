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

export async function test_api_customer_shipment_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that an authenticated customer receives a not-found response for a
   * shipment identifier that cannot be resolved.
   *
   * This test registers a customer session, then requests shipment details with
   * a random UUID that is not expected to match any persisted shipment record.
   * The endpoint must reject the lookup with a not-found error rather than
   * exposing unrelated order or seller information for a stale reference.
   *
   * 1. Register and authenticate a customer account.
   * 2. Request shipment details using a non-existent shipment UUID.
   * 3. Confirm the API returns a not-found error.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "http://localhost/",
      referrer: "http://localhost/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  await TestValidator.httpError(
    "missing shipment should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.customer.shipments.at(
        customerConnection,
        {
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
