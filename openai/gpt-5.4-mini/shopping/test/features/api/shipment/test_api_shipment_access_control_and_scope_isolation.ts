import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test shipment browsing access control and scope isolation.
 *
 * Verifies that the shipment browsing endpoint enforces actor-based access control
 * and that returned shipment summaries remain scoped to the caller's permitted
 * visibility. The test covers the restricted non-administrator path and the
 * administrator browsing path, with special attention to cross-account leakage
 * prevention.
 *
 * 1. Authenticate a customer and confirm the administrator shipment browse endpoint
 *    rejects non-administrator access.
 * 2. Authenticate an administrator and browse shipments with a narrow scope using
 *    the authenticated customer identifier when possible.
 * 3. Validate that returned shipment summaries do not expose shipments outside
 *    the requested scope.
 */
export async function test_api_shipment_access_control_and_scope_isolation(
  connection: api.IConnection,
): Promise<void> {
  const password = "password123!";
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const forbiddenConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(forbiddenConnection, {
    body: {
      email: customer.email,
      password,
    } satisfies IMallPlatformCustomer.ILogin,
  });
  await TestValidator.error(
    "customer should not access administrator shipment browsing",
    async () => {
      await api.functional.mallPlatform.administrator.shipments.index(
        forbiddenConnection,
        {
          body: {
            page: 1,
            limit: 10,
            customerId: customer.id,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    },
  );
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const page = await api.functional.mallPlatform.administrator.shipments.index(
    administratorConnection,
    {
      body: {
        page: 1,
        limit: 10,
        customerId: customer.id,
      } satisfies IMallPlatformShipment.IRequest,
    },
  );
  typia.assert(page);
  for (const shipment of page.data) {
    typia.assert(shipment);
    TestValidator.predicate(
      "shipment summary should remain within the requested customer scope",
      shipment.order.customer.id === customer.id,
    );
  }
}
