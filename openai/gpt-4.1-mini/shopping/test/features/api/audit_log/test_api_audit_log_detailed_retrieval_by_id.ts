import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";

export async function test_api_audit_log_detailed_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin user joins (registers)
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(30),
        status: "active",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Create admin account (ensures admin existence)
  const admin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: {
        email: adminAuthorized.email,
        password_hash: adminAuthorized.password_hash,
        status: "active",
        full_name: adminAuthorized.full_name,
        phone_number: adminAuthorized.phone_number,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Retrieve audit log entry by id
  const auditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const auditLog: IShoppingMallAuditLog =
    await api.functional.shoppingMall.auditLogs.at(connection, {
      id: auditLogId,
    });
  typia.assert(auditLog);

  // 4. Validate audit log properties
  TestValidator.predicate(
    "audit log id format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      auditLog.id,
    ),
  );

  if (auditLog.admin_id !== null && auditLog.admin_id !== undefined) {
    TestValidator.predicate(
      "audit log admin_id format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        auditLog.admin_id,
      ),
    );
  } else {
    TestValidator.equals(
      "audit log admin_id is null or undefined",
      auditLog.admin_id,
      null,
    );
  }

  if (auditLog.entity_id !== null && auditLog.entity_id !== undefined) {
    TestValidator.predicate(
      "audit log entity_id format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        auditLog.entity_id,
      ),
    );
  } else {
    TestValidator.equals(
      "audit log entity_id is null or undefined",
      auditLog.entity_id,
      null,
    );
  }

  TestValidator.predicate(
    "audit log action is non-empty string",
    typeof auditLog.action === "string" && auditLog.action.length > 0,
  );

  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
  TestValidator.predicate(
    "audit log timestamp ISO 8601 format",
    iso8601Regex.test(auditLog.timestamp),
  );

  if (auditLog.details !== null && auditLog.details !== undefined) {
    TestValidator.predicate(
      "audit log details is string",
      typeof auditLog.details === "string",
    );
  } else {
    TestValidator.equals(
      "audit log details is null or undefined",
      auditLog.details,
      null,
    );
  }
}
