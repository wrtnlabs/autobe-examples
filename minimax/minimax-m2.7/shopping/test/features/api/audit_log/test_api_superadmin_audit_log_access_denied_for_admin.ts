import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import type { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_audit_log_access_denied_for_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super admin account and login to get valid credentials
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  // 2. Create a regular admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 3. Attempt to access super admin audit log with regular admin credentials
  // This should return HTTP 403 Forbidden
  const fakeLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "admin cannot access super admin audit logs",
    403,
    async () => {
      await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.at(
        adminConnection,
        {
          logId: fakeLogId,
        },
      );
    },
  );
}
