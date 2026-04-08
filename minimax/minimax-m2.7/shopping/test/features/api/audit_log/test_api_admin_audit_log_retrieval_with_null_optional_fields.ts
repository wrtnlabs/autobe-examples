import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieving an audit log entry where optional fields (details, userAgent) may be null.
 *
 * Validates the audit log retrieval endpoint correctly handles null values for optional fields.
 * This test verifies that:
 * - The API properly returns null for optional fields when not provided
 * - JSON responses explicitly represent null values (not omitting the property)
 * - Required fields are always present and non-null
 * - Type validation passes for both null and non-null optional field values
 *
 * The test focuses on verifying the server's handling of nullable fields in audit log records,
 * ensuring consistent API behavior regardless of whether optional metadata is provided.
 *
 * 1. Register a super admin account for authentication
 * 2. Call the audit log retrieval endpoint with a test UUID
 * 3. Validate all fields are properly typed and null handling is correct
 */
export async function test_api_admin_audit_log_retrieval_with_null_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin account for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a test UUID for the audit log ID
  const logId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the audit log entry by ID
  const auditLog =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.at(
      superAdminConnection,
      {
        logId: logId,
      },
    );
  // 4. Validate response with typia.assert()
  // This performs complete runtime type validation including:
  // - All required fields are present and non-null
  // - Optional fields (details, userAgent) can be null or string
  // - All format validations (UUID, date-time)
  typia.assert(auditLog);
  // 5. Validate required fields are non-null
  TestValidator.equals("admin is non-null", auditLog.admin !== null, true);
  TestValidator.equals("admin has id", auditLog.admin.id !== undefined, true);
  TestValidator.equals(
    "admin has email",
    auditLog.admin.email !== undefined,
    true,
  );
  TestValidator.equals(
    "admin has name",
    auditLog.admin.name !== undefined,
    true,
  );
  TestValidator.equals(
    "action is non-null",
    auditLog.action !== null && auditLog.action !== undefined,
    true,
  );
  TestValidator.equals(
    "resourceType is non-null",
    auditLog.resourceType !== null && auditLog.resourceType !== undefined,
    true,
  );
  TestValidator.equals(
    "resourceId is non-null",
    auditLog.resourceId !== null && auditLog.resourceId !== undefined,
    true,
  );
  TestValidator.equals(
    "ipAddress is non-null",
    auditLog.ipAddress !== null && auditLog.ipAddress !== undefined,
    true,
  );
  TestValidator.equals(
    "createdAt is non-null",
    auditLog.createdAt !== null && auditLog.createdAt !== undefined,
    true,
  );
  // 6. Validate optional fields can be null or string
  // details field: string | null
  const detailsValid =
    auditLog.details === null || typeof auditLog.details === "string";
  TestValidator.predicate("details is string or null", detailsValid);
  // userAgent field: string | null
  const userAgentValid =
    auditLog.userAgent === null || typeof auditLog.userAgent === "string";
  TestValidator.predicate("userAgent is string or null", userAgentValid);
  // 7. Validate timestamps are in valid ISO 8601 format
  const iso8601Pattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/;
  TestValidator.predicate(
    "createdAt is ISO 8601 format",
    iso8601Pattern.test(auditLog.createdAt),
  );
}
