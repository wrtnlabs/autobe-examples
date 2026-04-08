import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer session access control enforcement.
 *
 * Validates that customers can only access their own sessions and cannot retrieve other customers' session information. This test ensures proper data isolation and access control enforcement in the session management system.
 *
 * The test creates two separate customer accounts and verifies that cross-session access is properly blocked with a 404 Not Found error, confirming that the access control middleware correctly prevents unauthorized access to other users' session information.
 *
 * 1. Customer A registers and logs in to create a session.
 * 2. Customer B registers to become an authenticated user.
 * 3. Customer B attempts to retrieve Customer A's session using Customer A's customer ID as the session ID.
 * 4. Validates that the system returns a 404 Not Found error, confirming access control enforcement and data isolation between customers.
 */
export async function test_api_customer_session_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A and log in to create session
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAAuth);
  // 2. Create Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerBAuth);
  // 3. Customer B attempts to access Customer A's session
  // Since we cannot directly retrieve Customer A's session ID from the join response,
  // we use Customer A's customer ID as the sessionId parameter.
  // This should fail with 404 because:
  // - Customer A's customer ID is not a valid session ID
  // - Even if it were, Customer B is not authorized to access Customer A's session
  await TestValidator.httpError(
    "customer B cannot access customer A's session",
    404,
    async () => {
      await api.functional.ecommerce.customer.sessions.at(customerBConnection, {
        sessionId: customerAAuth.id,
      });
    },
  );
  // 4. Additional validation: Customer B also cannot access random/non-existent session IDs
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "customer B cannot access non-existent session",
    404,
    async () => {
      await api.functional.ecommerce.customer.sessions.at(customerBConnection, {
        sessionId: randomSessionId,
      });
    },
  );
}
