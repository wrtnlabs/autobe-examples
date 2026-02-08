import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test unban of banned customers in administrator context.
 *
 * Scenarios:
 * 1. Successful unban of previously banned customer.
 * 2. Unban attempt of not banned customer should fail.
 * 3. Authorization checks to prevent unauthorized unban.
 */
export async function test_api_administrator_banned_users_customers_unban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      // Use empty join since IJoin is empty object
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Prepare a random customerId for banning
  const bannedCustomerId = typia.random<string & tags.Format<"uuid">>();
  // 2. Ban the customer to prepare unban
  const banBody: IShoppingMallBannedUser.IBanCustomerRequest =
    typia.random<IShoppingMallBannedUser.IBanCustomerRequest>();
  const banRecord =
    await api.functional.shoppingMall.administrator.banned_users.customers.ban.banCustomer(
      adminConnection,
      {
        customerId: bannedCustomerId,
        body: banBody,
      },
    );
  typia.assert(banRecord);
  // 3. Unban the previously banned customer - success scenario
  const unbanResult =
    await api.functional.shoppingMall.administrator.banned_users.customers.unban.unbanCustomer(
      adminConnection,
      { customerId: bannedCustomerId },
    );
  typia.assert(unbanResult);
  // Validate the unbanResult by type assertion only without invalid property references
  // 4. Unban attempt for a customer not banned - should error
  const nonBannedCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("unban non-banned customer fails", async () => {
    await api.functional.shoppingMall.administrator.banned_users.customers.unban.unbanCustomer(
      adminConnection,
      { customerId: nonBannedCustomerId },
    );
  });
  // 5. Unauthorized unban attempt - no authorization header
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized unban attempt", 401, async () => {
    await api.functional.shoppingMall.administrator.banned_users.customers.unban.unbanCustomer(
      unauthorizedConnection,
      { customerId: bannedCustomerId },
    );
  });
}
