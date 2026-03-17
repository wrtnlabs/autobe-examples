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
 * Test customer session retrieval functionality.
 *
 * This test validates the session metadata retrieval endpoint:
 * 1. Register a new customer account to create an authenticated session
 * 2. Generate a valid session ID (UUID format) for querying
 * 3. Call GET /shoppingMall/customer/sessions/{sessionId} to retrieve session details
 * 4. Validate response structure matches IShoppingMallCustomerSession interface
 *
 * Note: The session ID is not directly exposed in the IAuthorized token response,
 * so we generate a valid UUID to test the endpoint's response structure and validation.
 */
export async function test_api_customer_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer to create authenticated session
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authResult);
  // 2. Generate valid session ID for querying (session ID not exposed in auth response)
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve session details
  const session = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session has all required fields (typia.assert validates types)
  // Verify customer object is properly nested
  TestValidator.predicate(
    "customer object exists",
    session.customer !== null && session.customer !== undefined,
  );
  TestValidator.predicate(
    "customer ID is not empty",
    session.customer.id.length > 0,
  );
  TestValidator.predicate(
    "customer email is not empty",
    session.customer.email.length > 0,
  );
}
