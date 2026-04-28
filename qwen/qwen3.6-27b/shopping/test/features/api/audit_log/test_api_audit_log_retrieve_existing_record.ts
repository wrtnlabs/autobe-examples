import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of a specific audit log record by its unique identifier.
 *
 * Validates the complete audit log retrieval flow including admin authentication, immutable record lookup, and comprehensive response validation. The system queries the append-only audit ledger for a record matching the provided logId UUID and returns full details including the performing administrator's summary (with grade and ban status), target entity type and identifier, specific governance action performed, optional justification reason, and exact creation timestamp.
 *
 * Special attention is given to verifying the admin relationship properly resolves to IEcommercePlatformAdmin.ISummary format and that immutable audit fields are correctly populated with proper UUID and date-time formats.
 *
 * 1. Administrator registers and authenticates for platform access.
 * 2. Administrator queries the audit log endpoint with a valid record UUID.
 * 3. System retrieves the immutable audit log record from the append-only ledger.
 * 4. Validates complete response structure including admin summary, target entity, action, reason, and creation timestamp.
 */
export async function test_api_audit_log_retrieve_existing_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection for isolation
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as administrator using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 3. Generate audit log record UUID for retrieval
  const logId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve audit log record by UUID
  const auditLog: IEcommercePlatformAdminAuditLog =
    await api.functional.ecommercePlatform.admin.audit_logs.at(
      adminConnection,
      {
        logId,
      },
    );
  // 5. Validate complete response type (all properties, formats, constraints)
  typia.assert(auditLog);
  // 6. Validate business logic: performed admin summary fields populated
  TestValidator.predicate(
    "admin summary has valid ID",
    auditLog.admin.id.length > 0,
  );
  TestValidator.predicate(
    "admin summary has valid created_at timestamp",
    auditLog.admin.created_at !== undefined,
  );
}
