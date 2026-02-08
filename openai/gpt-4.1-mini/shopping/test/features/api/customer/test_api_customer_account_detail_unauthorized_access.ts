import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that unauthorized users cannot access customer account details.
 * Attempt to retrieve customer account without administrator authorization.
 * Verify that access is denied with proper HTTP error codes (401 or 403).
 */
export async function test_api_customer_account_detail_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and join to have valid administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_administrator_join utility to register administrator user
  // Provide an empty body {} for IShoppingMallAdministrator.IJoin as per DTO
  const auth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(auth);
  // Set Authorization header with valid administrator access token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${auth.token.access}`,
  };
  // Create a base connection WITHOUT auth header to simulate unauthorized user
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID to use as customerId to attempt to access
  const randomCustomerId = typia.random<string & typia.tags.Format<"uuid">>();
  // Attempt to fetch customer detail without authorization
  await TestValidator.httpError(
    "unauthorized customer detail access returns 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.customers.at(
        unauthorizedConnection,
        { customerId: randomCustomerId },
      );
    },
  );
}
