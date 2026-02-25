import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_banned_users_create } from "../../../generate/generate_random_shopping_mall_administrator_banned_users_create";
import { prepare_random_shopping_mall_banned_user } from "../../../prepare/prepare_random_shopping_mall_banned_user";

export async function test_api_administrator_banned_users_customers_ban_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful banning of an existing customer user by an administrator.
  // 1. Administrator account creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
        password: "strongpassword",
      },
    });
  typia.assert(adminJoinResult);
  // 2. Prepare a valid customer id (simulate as no customer creation endpoint provided)
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Ban the customer user using the utility function
  const bannedUser: IShoppingMallBannedUser =
    await api.functional.shoppingMall.administrator.banned_users.customers.ban.banCustomer(
      adminConnection,
      { customerId },
    );
  typia.assert(bannedUser);
  // 4. Validate banned user record
  TestValidator.equals(
    "banned user customer id",
    bannedUser.customer?.id,
    customerId,
  );
  TestValidator.predicate(
    "ban reason is not empty",
    bannedUser.banReason.length > 0,
  );
  TestValidator.predicate(
    "createdAt timestamp is valid",
    Boolean(bannedUser.createdAt),
  );
  TestValidator.predicate(
    "updatedAt timestamp is valid",
    Boolean(bannedUser.updatedAt),
  );
  TestValidator.equals("deletedAt is null", bannedUser.deletedAt, null);
}
