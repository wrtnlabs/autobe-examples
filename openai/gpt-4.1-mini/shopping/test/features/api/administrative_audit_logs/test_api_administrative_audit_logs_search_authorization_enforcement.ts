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

export async function test_api_administrative_audit_logs_search_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Attempt search without authentication
  await TestValidator.httpError(
    "unauthorized search rejection",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.administrative_audit_logs.search.index(
        connection,
        {
          body: {},
        },
      );
    },
  );
  // Administrator join and authorized connection setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // Perform valid search query with authorized admin connection
  const searchBody: IShoppingMallAdministrativeAuditLog.IRequest = {
    limit: 10,
    offset: 0,
    page: 1,
  };
  const output =
    await api.functional.shoppingMall.administrator.administrative_audit_logs.search.index(
      adminConnection,
      {
        body: searchBody,
      },
    );
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination limit positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current page positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  // Validate data array
  for (const auditLog of output.data) {
    typia.assert(auditLog);
    TestValidator.predicate(
      "audit log has id",
      typeof auditLog.id === "string" && auditLog.id.length > 0,
    );
    TestValidator.predicate(
      "audit log has actionType",
      typeof auditLog.actionType === "string" && auditLog.actionType.length > 0,
    );
    TestValidator.predicate(
      "audit log has targetEntity",
      typeof auditLog.targetEntity === "string" &&
        auditLog.targetEntity.length > 0,
    );
    TestValidator.predicate(
      "audit log has createdAt",
      typeof auditLog.createdAt === "string" && auditLog.createdAt.length > 0,
    );
    // Administrator summary presence
    TestValidator.predicate(
      "audit log has administrator",
      auditLog.administrator !== null &&
        typeof auditLog.administrator === "object",
    );
    // Validate administrator summary
    typia.assert(auditLog.administrator);
  }
}
