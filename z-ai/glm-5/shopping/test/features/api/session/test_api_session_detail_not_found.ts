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
 * Test retrieval of a non-existent session returns 404 Not Found.
 *
 * This test validates that when a customer attempts to retrieve session details
 * for a session ID that does not exist in the database, the API returns a 404
 * Not Found error instead of revealing information about the session's existence.
 *
 * Test Steps:
 * 1. Customer registers via join endpoint to establish authenticated context
 * 2. Generate a valid UUID format that does not correspond to any existing session
 * 3. Call GET /shoppingMall/customer/sessions/{nonExistentSessionId}
 * 4. Validate the response returns 404 Not Found status
 */
export async function test_api_session_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection via join
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Step 2: Generate a non-existent session ID (valid UUID format)
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3 & 4: Attempt to retrieve non-existent session and expect 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent session",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sessions.at(
        customerConnection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
