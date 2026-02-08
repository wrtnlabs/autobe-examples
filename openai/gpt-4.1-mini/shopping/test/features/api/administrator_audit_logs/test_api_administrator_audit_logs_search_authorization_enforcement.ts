import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
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

export async function test_api_administrator_audit_logs_search_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // This test scenario verifies that authorization enforcement is correctly applied on the audit log search endpoint.
  // It attempts to access the endpoint without authentication and expects failure (401 Unauthorized).
  // Then it performs the search after authenticating as an administrator user (join).
  // The scenario guarantees that only authorized administrators can perform audit log searches, maintaining strict access control for security and compliance purposes.
  // Prepare unauthorized connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Try to directly call the audit log search endpoint without authorization
  await TestValidator.httpError(
    "unauthorized access without login",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.audit_logs.search.index(
        unauthorizedConnection,
        {
          body: {},
        },
      );
    },
  );
  // Prepare authorized administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Join (register) administrator to obtain authorization tokens
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {}, // According to IShoppingMallAdministrator.IJoin type, which is empty object
  });
  typia.assert(authorized);
  // Set Authorization header with token.access
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Execute authorized audit log search
  const auditLogSearchResult =
    await api.functional.shoppingMall.administrator.audit_logs.search.index(
      adminConnection,
      {
        body: {}, // Empty body matches IShoppingMallAdministratorAuditLog.IRequest, which has no properties
      },
    );
  typia.assert(auditLogSearchResult);
  // Validate the result is a paginated summary (IPageIShoppingMallAdministratorAuditLog.ISummary)
  TestValidator.predicate(
    "audit log search result has pagination",
    auditLogSearchResult.pagination !== undefined &&
      auditLogSearchResult.data !== undefined &&
      Array.isArray(auditLogSearchResult.data),
  );
}
