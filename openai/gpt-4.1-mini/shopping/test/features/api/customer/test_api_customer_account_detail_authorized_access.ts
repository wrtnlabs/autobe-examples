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

export async function test_api_customer_account_detail_authorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving detailed customer account information by a valid customerId as an authorized administrator
  // 1. Administrator account creation and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Since IShoppingMallAdministrator.IJoin is empty type, join with empty object
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Set Authorization header in a new connection
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Prepare a valid customerId (random valid uuid) for existence case
  const validCustomerId = typia.random<string & tags.Format<"uuid">>();
  // Call API with valid customerId
  const customer = await api.functional.shoppingMall.administrator.customers.at(
    authorizedConnection,
    {
      customerId: validCustomerId,
    },
  );
  // Assert the response is matching IShoppingMallCustomer
  typia.assert(customer);
  // Test unauthorized access (no Authorization header)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access forbidden",
    401,
    async () =>
      await api.functional.shoppingMall.administrator.customers.at(
        unauthorizedConnection,
        {
          customerId: validCustomerId,
        },
      ),
  );
  // Test customerId not found - assume random uuid does not exist
  const notExistCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "customer not found returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.customers.at(
        authorizedConnection,
        {
          customerId: notExistCustomerId,
        },
      ),
  );
}
