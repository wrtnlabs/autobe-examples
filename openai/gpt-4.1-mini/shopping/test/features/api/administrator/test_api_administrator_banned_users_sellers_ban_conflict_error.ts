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

export async function test_api_administrator_banned_users_sellers_ban_conflict_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration (join)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin =
    typia.random<IShoppingMallAdministrator.IJoin>();
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(authorizedAdmin);
  // Update connection headers with admin token
  adminConnection.headers = {
    Authorization: `Bearer ${authorizedAdmin.token.access}`,
  };
  // 2. Generate a new seller ID to ban
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Ban the seller successfully
  const banBody: IShoppingMallBannedUser.IBanCreate =
    typia.random<IShoppingMallBannedUser.IBanCreate>();
  const ban =
    await api.functional.shoppingMall.administrator.banned_users.sellers.ban(
      adminConnection,
      { sellerId, body: banBody },
    );
  typia.assert(ban);
  // 4. Attempt to ban the same seller again and expect a conflict error
  await TestValidator.httpError(
    "Ban an already banned seller triggers conflict error",
    409,
    async () => {
      await api.functional.shoppingMall.administrator.banned_users.sellers.ban(
        adminConnection,
        { sellerId, body: banBody },
      );
    },
  );
}
