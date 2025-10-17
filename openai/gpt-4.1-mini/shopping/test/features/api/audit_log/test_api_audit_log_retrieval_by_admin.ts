import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";

/**
 * Validate the retrieval of detailed information of a specific audit log entry
 * by an authorized admin user.
 *
 * Business context: Ensure that admin users can securely access audit logs that
 * record administrative or system actions. Validate the complete user journey:
 * admin authentication, audit log existence, and authorized retrieval.
 *
 * Test steps:
 *
 * 1. Register and authenticate an admin user using the join API.
 * 2. Confirm admin user existence by creating or verifying admin entity.
 * 3. Retrieve an existing audit log entry using a general audit log API.
 * 4. Retrieve the specific audit log details via the admin audit log API.
 * 5. Assert type correctness and completeness of audit log details.
 * 6. Attempt unauthorized access with invalid authorization and assert failure.
 */
export async function test_api_audit_log_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Ensure admin user exists (create or verify)
  const adminCreateConfirmBody = {
    email: authorizedAdmin.email,
    password_hash: authorizedAdmin.password_hash,
    full_name: authorizedAdmin.full_name ?? null,
    phone_number: authorizedAdmin.phone_number ?? null,
    status: authorizedAdmin.status,
  } satisfies IShoppingMallAdmin.ICreate;

  const adminUser: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: adminCreateConfirmBody,
    });
  typia.assert(adminUser);

  // 3. Retrieve an existing audit log entry from general audit log API
  const genericAuditLog: IShoppingMallAuditLog =
    await api.functional.shoppingMall.auditLogs.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(genericAuditLog);

  // 4. Retrieve audit log details as authorized admin
  const adminAuditLogDetails: IShoppingMallAuditLog =
    await api.functional.shoppingMall.admin.auditLogs.at(connection, {
      id: genericAuditLog.id,
    });
  typia.assert(adminAuditLogDetails);

  // 5. Validate that the audit log details include expected properties
  TestValidator.predicate(
    "admin audit log contains valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminAuditLogDetails.id,
    ),
  );

  TestValidator.predicate(
    "admin audit log has ISO 8601 formatted timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      adminAuditLogDetails.timestamp,
    ),
  );

  TestValidator.predicate(
    "admin audit log action is non-empty string",
    typeof adminAuditLogDetails.action === "string" &&
      adminAuditLogDetails.action.length > 0,
  );

  TestValidator.predicate(
    "admin audit log admin_id is string UUID or null",
    adminAuditLogDetails.admin_id === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        adminAuditLogDetails.admin_id ?? "",
      ),
  );

  TestValidator.predicate(
    "admin audit log entity_id is string UUID or null",
    adminAuditLogDetails.entity_id === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        adminAuditLogDetails.entity_id ?? "",
      ),
  );

  // 6. Test unauthorized access fails
  // Prepare a connection without authorization by cloning and removing headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access to admin audit log fails",
    async () => {
      await api.functional.shoppingMall.admin.auditLogs.at(unauthConnection, {
        id: genericAuditLog.id,
      });
    },
  );
}
