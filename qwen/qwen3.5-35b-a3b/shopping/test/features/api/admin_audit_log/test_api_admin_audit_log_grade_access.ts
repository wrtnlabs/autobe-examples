import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_log_grade_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular admin account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 2. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 3. Test regular admin can access audit logs
  const randomAuditLogId1 = typia.random<string & tags.Format<"uuid">>();
  const regularAdminAuditLog =
    await api.functional.ecommerceMall.admin.audit_logs.at(
      regularAdminConnection,
      {
        auditLogId: randomAuditLogId1,
      },
    );
  typia.assert(regularAdminAuditLog);
  // 4. Test super admin can access audit logs
  const randomAuditLogId2 = typia.random<string & tags.Format<"uuid">>();
  const superAdminAuditLog =
    await api.functional.ecommerceMall.admin.audit_logs.at(
      superAdminConnection,
      {
        auditLogId: randomAuditLogId2,
      },
    );
  typia.assert(superAdminAuditLog);
  // 5. Validate both admin grades can retrieve audit logs
  TestValidator.equals(
    "regular admin can access audit logs",
    regularAdminAuditLog.id,
    randomAuditLogId1,
  );
  TestValidator.equals(
    "super admin can access audit logs",
    superAdminAuditLog.id,
    randomAuditLogId2,
  );
  // 6. Validate audit log structure contains expected fields
  TestValidator.equals(
    "audit log has admin_id field",
    typeof regularAdminAuditLog.admin_id,
    "string",
  );
  TestValidator.equals(
    "audit log has action_type field",
    typeof regularAdminAuditLog.action_type,
    "string",
  );
  TestValidator.equals(
    "audit log has target_entity_type field",
    typeof regularAdminAuditLog.target_entity_type,
    "string",
  );
  TestValidator.equals(
    "audit log has created_at field",
    typeof regularAdminAuditLog.created_at,
    "string",
  );
}
