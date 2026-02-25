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

export async function test_api_administrator_banned_user_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Unauthorized access to banned user detail endpoint must be rejected.
  // 1. Admin join (required to have banned user id for test, but no admin auth used in final test)
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123",
    },
  });
  // 2. Use random UUID to simulate bannedUserId (no real data retrieval, as unauthorized access is tested)
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to access banned user detail WITHOUT using admin authorization connection
  // This means using the base connection without Authorization header
  // The following call must fail with 401 or 403
  await TestValidator.httpError(
    "Unauthorized access to banned user detail returns 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.bannedUsers.at(
        connection,
        {
          bannedUserId: bannedUserId,
        },
      );
    },
  );
}
