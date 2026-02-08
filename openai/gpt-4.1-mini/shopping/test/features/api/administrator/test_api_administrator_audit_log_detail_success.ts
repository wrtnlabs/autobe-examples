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

export async function test_api_administrator_audit_log_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving detailed information about an existing audit log entry by its unique auditLogId.
  // Includes administrator authentication, fetching audit log detail, and response validation.
  // 1. Administrator join (authentication)
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  // Set authorization header for subsequent requests
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare a valid auditLogId (simulate random UUID since no creation API provided)
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch audit log detail
  const auditLogDetail =
    await api.functional.shoppingMall.administrator.audit_logs.at(
      adminConnection,
      { auditLogId },
    );
  // 4. Validate response type
  typia.assert(auditLogDetail);
}
