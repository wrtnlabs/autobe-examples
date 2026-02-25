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

export async function test_api_administrator_banned_user_update_ban_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins (registers account)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securepassword",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Create a customer by random data (simulate customer creation)
  // We need a customer to ban. Since no customer creation API or utility is provided,
  // emulate or assume a customer ID for test purposes by generating a UUID.
  const customerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Ban the customer to create a banned user record
  const bannedUser =
    await api.functional.shoppingMall.administrator.banned_users.customers.ban.banCustomer(
      adminConnection,
      { customerId },
    );
  typia.assert(bannedUser);
  // 4. Prepare new ban reason to update
  const newBanReason = RandomGenerator.paragraph({ sentences: 2 });
  // 5. Update the banned user record to change ban reason
  const updatedBannedUser =
    await api.functional.shoppingMall.administrator.bannedUsers.updateBannedUser(
      adminConnection,
      {
        bannedUserId: bannedUser.id,
        body: {
          banReason: newBanReason,
          deletedAt: bannedUser.deletedAt ?? null,
        } satisfies IShoppingMallBannedUser.IUpdate,
      },
    );
  typia.assert(updatedBannedUser);
  // 6. Validate that ban reason is updated
  TestValidator.equals(
    "ban reason updated",
    updatedBannedUser.banReason,
    newBanReason,
  );
  // 7. Validate that deletedAt is unchanged
  TestValidator.equals(
    "deletedAt remains unchanged",
    updatedBannedUser.deletedAt,
    bannedUser.deletedAt,
  );
  // 8. Validate that other properties do not change (id, customer reference)
  TestValidator.equals(
    "banned user id is same",
    updatedBannedUser.id,
    bannedUser.id,
  );
  TestValidator.equals(
    "customer id is same",
    updatedBannedUser.customer?.id,
    bannedUser.customer?.id,
  );
}
