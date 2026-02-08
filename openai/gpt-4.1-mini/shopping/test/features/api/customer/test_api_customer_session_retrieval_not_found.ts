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
 * Test retrieving a non-existent customer session should result in 404 error.
 *
 * Scenario:
 * 1. Authenticate as a new customer by calling the join endpoint with an empty body.
 * 2. Attempt to retrieve a non-existent customer session by providing a random UUID.
 * 3. Expect a 404 Not Found response and appropriate error message.
 */
export async function test_api_customer_session_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  /*
      Scenario:
      1. Authenticate as a new customer by calling the /auth/customer/join endpoint with valid credentials.
      2. Call GET /shoppingMall/customer/sessions/{sessionId} with a non-existent random UUID.
      3. Verify the response status is HTTP 404 Not Found.
      4. Confirm the response message indicates session not found.
  
      This scenario tests the system's behavior when trying to retrieve details for a non-existent customer session.
    */
  // 1. Authenticate as new customer
  const customerConnection: api.IConnection = { host: connection.host };
  // IShoppingMallCustomer.IJoin is {} (empty object), so provide empty object
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  // Update connection headers with authorization token
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Call GET with non-existent random UUID
  const fakeSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Expect 404 error
  await TestValidator.httpError(
    "session retrieval of non-existent UUID should 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sessions.at(
        customerConnection,
        {
          sessionId: fakeSessionId,
        },
      );
    },
  );
}
