import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministratorAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLogDetail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieving an existing administrator audit log entry by its unique identifier.
 *
 * Validates the complete audit log retrieval flow including administrator authentication and audit log entry access. Ensures that the audit log correctly contains all required fields including action details, security metadata, and field-level changes.
 *
 * Special attention is given to verifying the nested administrator object, the audit log details array with before/after values, and the immutability of audit records for platform oversight and security monitoring.
 *
 * 1. Authenticate as administrator with email and password credentials.
 * 2. Generate a valid audit log ID using typia.random for testing retrieval.
 * 3. Call GET /shoppingMall/administrator/audit-logs/{logId} with the generated logId.
 * 4. Validate response contains all required fields: id, action_type, target_type, target_id, ip_address, user_agent, created_at.
 * 5. Validate nested administrator object contains: id, email, grade, banned, created_at, deleted_at.
 * 6. Validate auditLogDetails array contains field-level changes with: id, field_name, old_value, new_value, created_at.
 * 7. Verify action_type matches expected administrative action values.
 * 8. Verify target_type indicates the entity type that was modified.
 * 9. Verify ip_address and user_agent contain valid security metadata.
 */
export async function test_api_administrator_audit_log_retrieve_existing(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Generate a valid audit log ID for retrieval test
  const logId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the audit log entry
  const auditLog: IShoppingMallAdministratorAuditLog =
    await api.functional.shoppingMall.administrator.audit_logs.at(
      adminConnection,
      { logId },
    );
  typia.assert(auditLog);
  // 4. Validate business logic: action_type is a valid non-empty string
  TestValidator.predicate(
    "action_type is non-empty string",
    auditLog.action_type.length > 0,
  );
  // 5. Validate business logic: target_type indicates entity type
  TestValidator.predicate(
    "target_type is non-empty string",
    auditLog.target_type.length > 0,
  );
  // 6. Validate security metadata: ip_address is present
  TestValidator.predicate(
    "ip_address is non-empty string",
    auditLog.ip_address.length > 0,
  );
  // 7. Validate user_agent is string or null
  TestValidator.predicate(
    "user_agent is string or null",
    typeof auditLog.user_agent === "string" || auditLog.user_agent === null,
  );
  // 8. Validate auditLogDetails array exists and is array
  TestValidator.predicate(
    "auditLogDetails is array",
    Array.isArray(auditLog.auditLogDetails),
  );
  // 9. Validate each audit log detail has valid field_name
  await ArrayUtil.asyncForEach(auditLog.auditLogDetails, async (detail) => {
    TestValidator.predicate(
      "detail field_name is non-empty",
      detail.field_name.length > 0,
    );
  });
  // 10. Validate administrator object grade is valid
  TestValidator.predicate(
    "administrator grade is non-empty",
    auditLog.administrator.grade.length > 0,
  );
  // 11. Validate administrator email format
  TestValidator.predicate(
    "administrator email is non-empty",
    auditLog.administrator.email.length > 0,
  );
}
