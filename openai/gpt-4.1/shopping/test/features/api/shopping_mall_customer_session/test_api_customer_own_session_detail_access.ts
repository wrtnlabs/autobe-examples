import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * Validates that a customer can access the details of their own session via
 * their customerId and sessionId.
 *
 * Due to API contract limitations (sessionId not available in join/login
 * response), this test demonstrates the endpoint and schema only.
 *
 * 1. Register a new customer via the join operation and extract customerId.
 * 2. Simulate the retrieval of a session for this customer using a plausible
 *    sessionId (random UUID) to demonstrate endpoint and type assertion; note
 *    that correct business validation requires session ID propagation from
 *    server, which is not currently supported.
 * 3. Assert response type shape by schema and that the returned session is for the
 *    correct customerId.
 */
export async function test_api_customer_own_session_detail_access(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerBody,
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;

  // 2. Simulate retrieval of a session record for this customer (real sessionId is not directly accessible under this API contract)
  // This is a demonstration of endpoint/type only; valid business test would require proper sessionId exposure from backend contract.
  const simulatedSessionId = typia.random<string & tags.Format<"uuid">>();
  const sessionDetail =
    await api.functional.shoppingMall.customer.customers.sessions.at(
      connection,
      {
        customerId,
        sessionId: simulatedSessionId,
      },
    );
  typia.assert(sessionDetail);
  TestValidator.equals(
    "customer id matches session owner",
    sessionDetail.customer.id,
    customerId,
  );
}
