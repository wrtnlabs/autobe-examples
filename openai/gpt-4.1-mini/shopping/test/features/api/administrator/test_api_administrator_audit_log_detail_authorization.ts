import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * E2E test for authorization enforcement on administrator audit log detail endpoint.
 *
 * This test tries to access audit log detail without authentication and expects failure,
 * then authenticates as administrator and succeeds. It verifies access control for audit logs.
 */
export async function test_api_administrator_audit_log_detail_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Base connection (no authentication)
  // Attempt to access audit log detail without authentication
  await TestValidator.httpError(
    "unauthorized access forbidden",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.audit_logs.at(
        connection,
        {
          auditLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  typia.assert(authorized);
  // The utility function already sets Authorization header internally
  // Then try to access audit log detail with authentication
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLog =
    await api.functional.shoppingMall.administrator.audit_logs.at(
      adminConnection,
      { auditLogId },
    );
  typia.assert(auditLog);
}
