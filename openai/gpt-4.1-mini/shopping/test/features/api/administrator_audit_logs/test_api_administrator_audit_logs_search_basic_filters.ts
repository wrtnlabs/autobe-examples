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

export async function test_api_administrator_audit_logs_search_basic_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // 2. Build search filter body with typical filters (event_type, actor_type, create_at dates)
  // According to provided DTO, IShoppingMallAdministratorAuditLog.IRequest is an empty object,
  // so for E2E testing, we will try empty body meaning no filter or pagination
  const searchBody: IShoppingMallAdministratorAuditLog.IRequest = {};
  // 3. Call API audit logs search endpoint
  const auditLogs =
    await api.functional.shoppingMall.administrator.audit_logs.search.index(
      adminConnection,
      {
        body: searchBody,
      },
    );
  typia.assert(auditLogs);
  // 4. Verify pagination information
  TestValidator.predicate(
    "pagination current page >= 1",
    auditLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    auditLogs.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    auditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    auditLogs.pagination.pages >= 0,
  );
  // 5. Verify received data array
  TestValidator.predicate(
    "auditLogs data is an array",
    Array.isArray(auditLogs.data),
  );
}
