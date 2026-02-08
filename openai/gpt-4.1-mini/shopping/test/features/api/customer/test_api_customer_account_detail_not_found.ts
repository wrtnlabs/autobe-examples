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

export async function test_api_customer_account_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // Compose a random UUID for non-existent customer ID
  const fakeCustomerId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to fetch details for a customer that does not exist
  await TestValidator.httpError(
    "request non-existent customer account detail returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.customers.at(
        adminConnection,
        {
          customerId: fakeCustomerId,
        },
      );
    },
  );
}
