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

export async function test_api_administrator_unban_seller_success_and_failure_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Administrator unbanning a banned seller
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  {
    // 1-1. Join an administrator
    const adminAuth = await authorize_administrator_join(adminConnection, {});
    typia.assert(adminAuth);
    // 1-2. Actor adminConnection updated internally
    adminConnection.headers = {
      Authorization: adminAuth.token.access,
    };
    // 1-3. Generate sellerId
    const sellerId = typia.random<string & tags.Format<"uuid">>();
    // 1-4. Ban the seller
    await api.functional.shoppingMall.administrator.banned_users.sellers.ban.banSeller(
      adminConnection,
      { sellerId },
    );
    // 1-5. Unban the seller
    await api.functional.shoppingMall.administrator.banned_users.sellers.unban.unbanSeller(
      adminConnection,
      { sellerId },
    );
    // 1-6. Validate unban (operation success means no error, no content returned)
    // 1-7. Try unbanning the same seller again to simulate failure path
    let errorCatched = false;
    try {
      await api.functional.shoppingMall.administrator.banned_users.sellers.unban.unbanSeller(
        adminConnection,
        { sellerId },
      );
    } catch {
      errorCatched = true;
    }
    TestValidator.predicate(
      "unban non-banned seller error caught",
      errorCatched,
    );
    // 1-8. Attempt to unban a random sellerId not banned
    const randomSellerId = typia.random<string & tags.Format<"uuid">>();
    let errorCatched2 = false;
    try {
      await api.functional.shoppingMall.administrator.banned_users.sellers.unban.unbanSeller(
        adminConnection,
        { sellerId: randomSellerId },
      );
    } catch {
      errorCatched2 = true;
    }
    TestValidator.predicate(
      "unban non-existent seller error caught",
      errorCatched2,
    );
  }
}
