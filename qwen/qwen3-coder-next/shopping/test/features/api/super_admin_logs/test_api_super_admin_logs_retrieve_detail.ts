import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_logs_retrieve_detail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResponse = await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(authResponse);
  // 2. Set up authenticated connection with authorization token
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: `Bearer ${authResponse.token.access}`,
    },
  };
  // 3. Retrieve log details with a sample UUID log ID
  const sampleLogId = typia.random<string & tags.Format<"uuid">>();
  const logEntry = await api.functional.shoppingMall.superAdmin.logs.at(
    authConnection,
    {
      logId: sampleLogId,
    },
  );
  typia.assert(logEntry);
}
