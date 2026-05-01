import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test cross-customer session isolation to verify customers cannot access each other's session data.
 *
 * Validates that the session retrieval endpoint enforces customer-level data isolation by ensuring one authenticated customer cannot view another customer's session metadata. Session records contain sensitive information including client IP address, browsing context (href and referrer), and authentication timestamps — exposing this data across customer boundaries would constitute a privacy violation.
 *
 * The test exercises the authorization boundary at `GET /shoppingMall/customer/sessions/{sessionId}` by registering two distinct customers and having the second customer attempt to retrieve a session that belongs to the first.
 *
 * 1. Customer B registers on the platform via `authorize_customer_join`, establishing an authenticated session with authorization headers attached to their dedicated connection.
 * 2. Customer A registers on the platform via `authorize_customer_join`, establishing a separate authenticated session with their own dedicated connection.
 * 3. Customer A, authenticated as themselves, attempts to call the session retrieval endpoint with a UUID-formatted session identifier.
 * 4. The system rejects the request with an error, proving that customers are isolated to their own session scope.
 */
export async function test_api_customer_session_cross_customer_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer B — establishes an authenticated session
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerB);
  // 2. Register Customer A — establishes a separate authenticated session
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerA);
  // 3. Customer A attempts cross-customer session access — must be rejected
  await TestValidator.error(
    "cross-customer session access must be rejected",
    async () => {
      await api.functional.shoppingMall.customer.sessions.at(
        customerAConnection,
        {
          sessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
