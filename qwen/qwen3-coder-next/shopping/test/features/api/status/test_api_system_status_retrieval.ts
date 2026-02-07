import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Join a super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  // 2. Authenticate as super admin
  const authenticatedConnection: api.IConnection = { host: connection.host };
  const authResponse: IShoppingMallSuperAdmin.IAuthorized =
    await api.functional.shoppingMall.auth.super_admin.login(
      authenticatedConnection,
      {
        body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
      },
    );
  typia.assert(authResponse);
  // 3. Retrieve system status
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const status: IShoppingMallSystematicStatus =
    await api.functional.shoppingMall.superAdmin.statuses.at(
      authenticatedConnection,
      {
        statusId,
      },
    );
  typia.assert(status);
  // 4. Validate response structure (empty object for now)
  TestValidator.equals("status is object", typeof status, "object");
}
