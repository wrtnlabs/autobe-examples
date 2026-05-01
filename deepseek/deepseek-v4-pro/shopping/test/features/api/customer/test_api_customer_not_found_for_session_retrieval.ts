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

/**
 * Test that retrieving a session for a non-existent customer returns 404.
 *
 * Validates that the administrator session retrieval endpoint correctly checks customer existence before attempting any session lookup. When a customer account does not exist, the endpoint must return HTTP 404 Not Found rather than 401 Unauthorized or 403 Forbidden.
 *
 * 1. Administrator registers and authenticates via the join endpoint.
 * 2. Administrator requests a session with randomly generated customerId and sessionId UUIDs that correspond to no existing records.
 * 3. Validates the endpoint responds with HTTP 404, confirming customer existence is checked first.
 */
export async function test_api_customer_not_found_for_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Attempt to retrieve session for non-existent customer
  await TestValidator.httpError(
    "404 when customer does not exist",
    404,
    async () => {
      await api.functional.shoppingMall.admin.customers.sessions.at(
        adminConnection,
        {
          customerId: typia.random<string & tags.Format<"uuid">>(),
          sessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
