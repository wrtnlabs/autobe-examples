import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies that customer logout only affects the current authenticated session.
 *
 * This test creates two separate customer accounts, authenticates them through independent session connections, and then logs out the first customer. It confirms that the first session can be ended without affecting the second session, which remains usable and can be logged out independently afterward.
 *
 * The scenario focuses on session isolation and ensures that one customer's logout cannot terminate another customer's active session. Because the logout endpoint does not return a body and no separate session-introspection endpoint is available in this scenario, successful logout of the second customer after the first logout serves as the observable proof of isolation.
 *
 * 1. Register two customers and capture their authorization tokens.
 * 2. Use separate actor-specific connections for each customer session.
 * 3. Log out the first customer session.
 * 4. Verify the second customer session remains active by logging it out successfully afterward.
 */
export async function test_api_customer_session_logout_scoped_to_current_user(
  connection: api.IConnection,
): Promise<void> {
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register/customer-1",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer1);
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register/customer-2",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer2);
  await api.functional.mallPlatform.customer.sessions.logout.erase(
    customer1Connection,
  );
  await api.functional.mallPlatform.customer.sessions.logout.erase(
    customer2Connection,
  );
}
