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
 * Test retrieval of a non-existent customer session returns 404.
 *
 * Validates that the session retrieval endpoint properly rejects requests for session identifiers that do not exist in the database. A customer is first registered and authenticated to establish the actor context, then a randomly generated UUID is used to query a session that cannot possibly exist.
 *
 * The endpoint must return a 404 Not Found error, confirming the business rule that the system does not leak information about resource existence and only returns data for valid session identifiers.
 *
 * 1. Customer registers and authenticates via the join endpoint.
 * 2. A random UUID is generated to simulate a non-existent session identifier.
 * 3. The session retrieval endpoint is called with the fake UUID.
 * 4. A 404 HttpError is expected, proving non-existent sessions are properly rejected.
 */
export async function test_api_customer_session_retrieve_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Generate random UUID for non-existent session
  const nonexistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt retrieval — expect 404 Not Found
  await TestValidator.httpError("non-existent session returns 404", 404, () =>
    api.functional.shoppingMall.customer.sessions.at(customerConnection, {
      sessionId: nonexistentSessionId,
    }),
  );
}
