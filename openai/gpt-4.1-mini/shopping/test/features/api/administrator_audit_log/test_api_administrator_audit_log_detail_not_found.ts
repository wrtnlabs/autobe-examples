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

export async function test_api_administrator_audit_log_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator by joining
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // Attach auth token to adminConnection headers internally by authorize function
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // Generate a random UUID not expected to exist in audit logs
  const nonExistentAuditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // Attempt to fetch audit log detail with non-existent auditLogId
  await TestValidator.httpError("audit log detail not found", 404, async () => {
    await api.functional.shoppingMall.administrator.audit_logs.at(
      adminConnection,
      {
        auditLogId: nonExistentAuditLogId,
      },
    );
  });
}
