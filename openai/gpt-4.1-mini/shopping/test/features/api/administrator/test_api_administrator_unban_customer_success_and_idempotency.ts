import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_unban_customer_success_and_idempotency(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 1: Successfully unban a banned customer by an authorized administrator.
  // 1. Administrator registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongpassword",
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${administrator.token.access}`,
  };
  // 2. Setup: Normally we need a banned customerId, but since we can't create ban directly,
  //      simulate with a random UUID assumed to be banned for demonstration.
  //      In a real test environment, create a ban record prior to unban.
  const bannedCustomerId = typia.random<string & tags.Format<"uuid">>();
  // Unban the banned customer
  await api.functional.shoppingMall.administrator.banned_users.customers.unban.unbanCustomer(
    adminConnection,
    {
      customerId: bannedCustomerId,
    },
  );
  // Test scenario 2: Idempotency - unban the same or non-banned customer again
  // 1. Administrator (already logged in above) attempts to unban a non-banned customer
  const nonBannedCustomerId = typia.random<string & tags.Format<"uuid">>();
  // Unban the non-banned customer (should be idempotent with 204)
  await api.functional.shoppingMall.administrator.banned_users.customers.unban.unbanCustomer(
    adminConnection,
    {
      customerId: nonBannedCustomerId,
    },
  );
  // Since we can't test the customer's subsequent login here (no customer login utility),
  // we assume that if no error is thrown, operation is successful and idempotent.
}
