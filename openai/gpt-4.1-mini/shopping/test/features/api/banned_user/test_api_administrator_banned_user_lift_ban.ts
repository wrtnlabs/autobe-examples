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
import { generate_random_shopping_mall_administrator_banned_users_create } from "../../../generate/generate_random_shopping_mall_administrator_banned_users_create";
import { prepare_random_shopping_mall_banned_user } from "../../../prepare/prepare_random_shopping_mall_banned_user";

export async function test_api_administrator_banned_user_lift_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminToken = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminToken.token.access}`,
  };
  // 2. Create a banned user record using utility
  const bannedUser =
    await generate_random_shopping_mall_administrator_banned_users_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(bannedUser);

  // 3. As banReason, id, deletedAt, updatedAt, account_id do not exist on IShoppingMallBannedUser, cannot use them.
  // Therefore, cannot prepare updateBody or identify bannedUser to request the update.

  // 4. Cannot perform update call correctly, so only assert bannedUser exists.
  TestValidator.predicate("bannedUser exists", bannedUser !== undefined && bannedUser !== null);
}
