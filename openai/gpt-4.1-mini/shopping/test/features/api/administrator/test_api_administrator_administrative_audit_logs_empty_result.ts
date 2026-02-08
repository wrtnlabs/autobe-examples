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

export async function test_api_administrator_administrative_audit_logs_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins (registers) to obtain authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Attach the access token to the adminConnection headers for authentication
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Retrieve administrative audit logs from empty database
  const auditLogs =
    await api.functional.shoppingMall.administrator.administrative_audit_logs.get(
      adminConnection,
    );
  // 3. Validate response structure and values
  typia.assert(auditLogs);
  // The data array must be empty
  TestValidator.equals("empty data array", auditLogs.data.length, 0);
  // Pagination records count must be 0
  TestValidator.equals(
    "pagination records count",
    auditLogs.pagination.records,
    0,
  );
  // Pagination pages count must be 0
  TestValidator.equals("pagination pages count", auditLogs.pagination.pages, 0);
  // Pagination current page must be valid (typically 1 or 0 if no data)
  TestValidator.predicate(
    "pagination current page is 0 or 1",
    auditLogs.pagination.current === 0 || auditLogs.pagination.current === 1,
  );
  // Pagination limit must be non-negative
  TestValidator.predicate(
    "pagination limit non-negative",
    auditLogs.pagination.limit >= 0,
  );
}
