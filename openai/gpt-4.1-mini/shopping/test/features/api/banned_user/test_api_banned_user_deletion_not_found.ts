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

export async function test_api_banned_user_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt deletion of a non-existent banned user record.
  // 1. Authenticate as administrator by creating admin account.
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_1",
    },
  });
  typia.assert(admin);
  // 2. Attempt to delete banned user record using a non-existent bannedUserId UUID
  const fakeBannedUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent banned user returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.bannedUsers.erase(
        adminConnection,
        {
          bannedUserId: fakeBannedUserId,
        },
      );
    },
  );
}
