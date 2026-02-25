import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrativeAuditLog";
import type { IShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeAuditLog";
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

export async function test_api_administrative_audit_logs_unauthorized_access_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Test unauthorized access rejection for administrative audit logs
  // 1. Attempt request without any authorization headers
  await TestValidator.httpError(
    "unauthorized without token",
    [401, 403],
    async () => {
      // The base connection has no authorization headers
      await api.functional.shoppingMall.administrator.administrativeAuditLogs.index(
        connection,
        { body: {} },
      );
    },
  );
  // 2. Create an administrator that is not logged in (no token attached)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  // 3. Attempt request with a fresh connection (no authorization headers) after admin creation
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized with new connection no token",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.administrativeAuditLogs.index(
        unauthorizedConnection,
        { body: {} },
      );
    },
  );
}
