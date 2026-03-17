import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_audit_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create dedicated super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register super admin and obtain authentication
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "http://localhost:3000/super-admin/join",
        referrer: "http://localhost:3000/",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Retrieve audit logs with pagination
  const auditLogs =
    await api.functional.ecommerceMall.superAdmin.super_admin_audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogs);
  // Validate pagination structure
  TestValidator.equals("current page", auditLogs.pagination.current, 1);
  TestValidator.equals("page limit", auditLogs.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    auditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    auditLogs.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(auditLogs.data));
}
