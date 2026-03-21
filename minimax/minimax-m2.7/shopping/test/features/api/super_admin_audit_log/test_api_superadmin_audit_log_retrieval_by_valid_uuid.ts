import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import type { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_audit_log_retrieval_by_valid_uuid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator to get authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Generate a valid UUID for the audit log retrieval
  const logId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the audit log entry by valid UUID
  const auditLog =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.at(
      superAdminConnection,
      {
        logId: logId,
      },
    );
  typia.assert(auditLog);
  // 4. Validate response structure and required fields
  TestValidator.equals("id matches requested logId", auditLog.id, logId);
  TestValidator.predicate("action type exists", auditLog.action.length > 0);
  TestValidator.predicate("ip address exists", auditLog.ip.length > 0);
  TestValidator.predicate("user agent exists", auditLog.user_agent.length > 0);
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(auditLog.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(auditLog.updated_at),
  );
  // 5. Validate superAdmin summary object
  TestValidator.predicate(
    "superAdmin summary has valid id",
    /^[0-9a-f-]{36}$/i.test(auditLog.superAdmin.id),
  );
  TestValidator.predicate(
    "superAdmin summary has valid email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auditLog.superAdmin.email),
  );
  // 6. Validate metadataEntries are ordered alphabetically by key
  if (auditLog.metadataEntries.length > 1) {
    for (let i = 1; i < auditLog.metadataEntries.length; i++) {
      TestValidator.predicate(
        "metadata entries are alphabetically ordered by key",
        auditLog.metadataEntries[i - 1].key.localeCompare(
          auditLog.metadataEntries[i].key,
        ) <= 0,
      );
    }
  }
  // 7. Validate each metadata entry structure
  for (const entry of auditLog.metadataEntries) {
    TestValidator.predicate(
      "metadata entry has valid id",
      /^[0-9a-f-]{36}$/i.test(entry.id),
    );
    TestValidator.predicate(
      "metadata entry has non-empty key",
      entry.key.length > 0,
    );
    TestValidator.predicate(
      "metadata entry has value",
      entry.value !== undefined,
    );
    TestValidator.predicate(
      "metadata entry has valid created_at",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(entry.created_at),
    );
  }
}
