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

export async function test_api_administrator_banned_user_lift_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinPayload: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: adminJoinPayload,
  });
  typia.assert(administrator);
  // adminConnection.headers now contains Authorization
  // 2. Ban a seller to create a banned user record
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.administrator.banned_users.sellers.ban.banSeller(
    adminConnection,
    { sellerId },
  );
  // 3. Lift the ban by updating banned user record
  // Since no GET API for banned user, assume bannedUserId equals sellerId for testing
  // This is a testing assumption due to limited API
  const updatePayload: IShoppingMallBannedUser.IUpdate = {
    banReason: "Ban reason remains unchanged",
    deletedAt: new Date().toISOString(),
  };
  const bannedUser =
    await api.functional.shoppingMall.administrator.bannedUsers.updateBannedUser(
      adminConnection,
      {
        bannedUserId: sellerId,
        body: updatePayload,
      },
    );
  typia.assert(bannedUser);
  // 4. Validate the banned user record
  TestValidator.equals(
    "ban reason unchanged",
    bannedUser.banReason,
    updatePayload.banReason,
  );
  TestValidator.predicate(
    "deletedAt is set",
    bannedUser.deletedAt !== null && bannedUser.deletedAt !== undefined,
  );
  // 5. Confirm that ban is lifted
  TestValidator.predicate("ban is lifted", bannedUser.deletedAt !== null);
}
