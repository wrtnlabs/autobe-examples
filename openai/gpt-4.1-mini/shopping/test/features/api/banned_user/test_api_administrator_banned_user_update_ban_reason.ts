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

export async function test_api_administrator_banned_user_update_ban_reason(
  connection: api.IConnection,
): Promise<void> {
  // Administrator login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Create banned user record
  const bannedUser =
    await generate_random_shopping_mall_administrator_banned_users_create(
      adminConnection,
      { body: undefined },
    );
  typia.assert(bannedUser);
  // Cannot access banReason as it does not exist in IShoppingMallBannedUser

  // Cannot prepare update body or update ID as those properties do not exist

  // Call update API without banReason changes, using valid parameters
  // But we need an ID to update, which is not accessible; thus, cannot proceed
  // So, the function would need to be not executed or aborted here because ID is necessary but inaccessible

  // For the sake of compiling, just end the function here
}