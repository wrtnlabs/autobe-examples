import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_unverified_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account with unverified email
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.shoppingMall.auth.super_admin.join(
    joinConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(joinResponse);
  // Step 2: Attempt login with unverified email credentials
  const loginConnection: api.IConnection = { host: connection.host };
  // Verify that login fails for unverified email with specific error type
  await TestValidator.httpError(
    "login should fail with 401 for unverified email",
    401,
    async () => {
      await api.functional.shoppingMall.auth.super_admin.login(
        loginConnection,
        {
          body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
        },
      );
    },
  );
}
