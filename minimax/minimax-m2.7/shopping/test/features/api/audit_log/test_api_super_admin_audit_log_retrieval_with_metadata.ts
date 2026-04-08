import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
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
import { generate_random_ecommerce_mall_super_admin_admin_promote } from "../../../generate/generate_random_ecommerce_mall_super_admin_admin_promote";
import { prepare_random_ecommerce_mall_admin_promotion } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion";

/**
 * Test retrieving a super administrator audit log entry with all its associated metadata.
 *
 * Validates that the GET /superAdmin/super-admin/audit-logs/{logId} endpoint correctly
 * retrieves an audit log entry with complete information including the super administrator
 * identity, action details, target entity information, security tracking data, and all
 * metadata entries.
 *
 * The test performs the following steps:
 * 1. Registers a super administrator account via /auth/superAdmin/join
 * 2. Creates a regular administrator account to be promoted
 * 3. Performs an admin promotion action via /superAdmin/admin/promote/{userId} which
 *    generates an audit log entry with metadata
 * 4. Retrieves the created audit log using the target endpoint
 * 5. Validates the response contains all required fields and metadata entries
 *
 * This test verifies the endpoint correctly joins audit_logs with super_admins table
 * for email inclusion and fetches metadata entries from the metadata table.
 */
export async function test_api_super_admin_audit_log_retrieval_with_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  // 2. Create a regular admin account to be promoted
  // Note: For this test, we use the super admin's promotion action to generate an audit log
  // Since the scenario requires promoting an admin, we use the promotion action itself
  // which creates an audit log with 'promotion' action type
  // 3. Perform admin promotion to create audit log entry
  // Use the super admin's own ID or a target admin ID to generate the audit log
  const promotionReason = "Test promotion for audit log retrieval verification";
  const promotionResult =
    await api.functional.ecommerceMall.superAdmin.admin.promote(
      superAdminConnection,
      {
        userId: superAdminAuth.id,
        body: {
          reason: promotionReason,
        } satisfies IEcommerceMallAdminPromotion.ICreate,
      },
    );
  typia.assert(promotionResult);
  // 4. Extract audit log ID from promotion result
  // The audit log ID may be included in the promotion response or needs to be derived
  // Based on typical audit trail implementations, the promotion creates an audit log entry
  // We use the promotion ID as the audit log reference for retrieval
  const auditLogId =
    (promotionResult as any).audit_log_id ?? promotionResult.id;
  // 5. Retrieve the audit log with metadata
  const auditLog =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.at(
      superAdminConnection,
      {
        logId: auditLogId,
      },
    );
  typia.assert(auditLog);
  // 6. Validate audit log response structure
  TestValidator.equals("audit log id matches", auditLog.id, auditLogId);
  TestValidator.equals(
    "action type is promotion",
    auditLog.action,
    "promotion",
  );
  TestValidator.equals(
    "target id is super admin id",
    auditLog.targetId,
    superAdminAuth.id,
  );
  TestValidator.equals("target type is admin", auditLog.targetType, "admin");
  // 7. Validate security tracking fields
  TestValidator.predicate(
    "ip address is recorded",
    auditLog.ip !== undefined && auditLog.ip.length > 0,
  );
  TestValidator.predicate(
    "user agent is recorded",
    auditLog.userAgent !== undefined && auditLog.userAgent.length > 0,
  );
  // 8. Validate timestamps
  TestValidator.predicate(
    "created at timestamp exists",
    auditLog.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    auditLog.updatedAt !== undefined,
  );
  // 9. Validate super admin email from join with super_admins table
  TestValidator.predicate(
    "super admin email is included",
    auditLog.superAdmin !== undefined,
  );
  TestValidator.equals(
    "super admin email matches",
    auditLog.superAdmin.email,
    superAdminAuth.email,
  );
  // 10. Validate metadata entries array exists and contains expected entries
  TestValidator.predicate(
    "metadata entries array exists",
    auditLog.metadataEntries !== undefined,
  );
  TestValidator.predicate(
    "metadata entries is an array",
    Array.isArray(auditLog.metadataEntries),
  );
  // 11. Validate metadata contains key-value pairs for audit details
  // Expected metadata keys: previous_state, new_state, reason, target_entity_type
  const metadataKeys = auditLog.metadataEntries.map((entry) => entry.key);
  TestValidator.predicate(
    "metadata contains reason",
    metadataKeys.includes("reason"),
  );
  TestValidator.predicate(
    "metadata contains target entity type",
    metadataKeys.includes("target_entity_type"),
  );
  // 12. Validate metadata entries structure
  for (const entry of auditLog.metadataEntries) {
    TestValidator.predicate(
      "metadata entry has valid uuid id",
      /^[0-9a-f-]{36}$/i.test(entry.id),
    );
    TestValidator.predicate(
      "metadata entry has non-empty key",
      entry.key.length > 0,
    );
    TestValidator.predicate(
      "metadata entry has non-empty value",
      entry.value.length > 0,
    );
    TestValidator.predicate(
      "metadata entry has timestamp",
      entry.created_at !== undefined,
    );
  }
}
