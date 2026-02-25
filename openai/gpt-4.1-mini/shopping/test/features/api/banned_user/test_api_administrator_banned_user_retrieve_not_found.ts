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

export async function test_api_administrator_banned_user_retrieve_not_found(
  connection: api.IConnection,
) {
  // Step 1: Administrator join and get authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "a1b2c3d4e5f6g7h8",
    },
  });
  typia.assert(adminAuthorized);
  // Update adminConnection headers for authenticated requests
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // Step 2: Call GET /shoppingMall/administrator/bannedUsers/{bannedUserId} with a random UUID that does not exist
  const randomBannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Expect 404 not found error
  await TestValidator.httpError(
    "banned user not found error",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.bannedUsers.at(
        adminConnection,
        {
          bannedUserId: randomBannedUserId,
        },
      );
    },
  );
}
