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

export async function test_api_administrator_banned_users_sellers_unban_primary_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // Prepare sellerId and ban reason
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  // 2. Administrator bans the seller
  const banResponse =
    await api.functional.shoppingMall.administrator.banned_users.sellers.ban(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          ban_reason: banReason,
        } satisfies IShoppingMallBannedUser.IBanCreate,
      },
    );
  typia.assert(banResponse);
  // 3. Administrator unbans the seller successfully
  const unbanResponse =
    await api.functional.shoppingMall.administrator.banned_users.sellers.unban(
      adminConnection,
      { sellerId: sellerId },
    );
  typia.assert(unbanResponse);
  // Validation: Cannot validate properties that do not exist on IShoppingMallBannedUser
  // 4. Attempt to unban a non-banned seller and expect failure
  // Use a new random sellerId that was never banned
  const nonBannedSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Unban non-banned seller error", async () => {
    await api.functional.shoppingMall.administrator.banned_users.sellers.unban(
      adminConnection,
      {
        sellerId: nonBannedSellerId,
      },
    );
  });
}
