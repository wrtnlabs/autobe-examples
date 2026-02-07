import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystematicStatus";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_status_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.super_admin.join(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  // 2. Login as super admin
  const loginOutput = await api.functional.shoppingMall.auth.super_admin.login(
    adminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
    },
  );
  typia.assert(loginOutput);
  // 3. Create authorized connection with JWT token
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: `Bearer ${loginOutput.token.access}`,
  };
  // 4. Retrieve system statuses
  const output: IPageIShoppingMallSystematicStatus.ISummary =
    await api.functional.shoppingMall.superAdmin.statuses.index(
      authorizedConnection,
      {
        body: typia.random<IShoppingMallSystematicStatus.IRequest>(),
      },
    );
  // 5. Validate response structure and pagination
  typia.assert(output);
  TestValidator.equals("has data array", Array.isArray(output.data), true);
  TestValidator.predicate("has pagination", output.pagination !== null);
  TestValidator.equals(
    "pagination has required fields",
    output.pagination.current > 0 &&
      output.pagination.limit > 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
    true,
  );
}
