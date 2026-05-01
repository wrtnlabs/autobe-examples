import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator retrieval of a non-existent session for an existing customer account.
 *
 * Validates that the admin session lookup endpoint correctly returns HTTP 404 Not Found when querying a session that does not exist under a valid customer. This confirms the endpoint properly scopes session lookups to the specified customer and does not leak information about whether a session ID exists elsewhere in the system.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Customer registers to create a valid customer account, providing a valid customerId.
 * 3. Administrator queries a non-existent session using the valid customerId and a randomly generated sessionId.
 * 4. Validates the endpoint returns HTTP 404, indicating the session is not found.
 */
export async function test_api_customer_session_not_found_for_valid_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a customer account to obtain a valid customer ID
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Attempt to retrieve a non-existent session for the valid customer
  await TestValidator.httpError(
    "session not found for valid customer",
    404,
    async () => {
      await api.functional.shoppingMall.admin.customers.sessions.at(
        adminConnection,
        {
          customerId: customer.id,
          sessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
