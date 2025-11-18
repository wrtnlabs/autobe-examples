import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that an admin can refine an existing account risk flag by updating
 * its severity and textual reason while keeping the risk code and other key
 * attributes unchanged.
 *
 * Business flow:
 *
 * 1. Register an admin using POST /auth/admin/join.
 * 2. As that admin, create a risk flag with a stable code (e.g.
 *    "HIGH_REFUND_RATE"), severity "medium", and an initial reason.
 * 3. Update the risk flag by PUT /shoppingMall/admin/accountRiskFlags/{riskFlagId}
 *    with a body that omits `code` but changes `severity` and `reason`.
 * 4. Assert that the returned record keeps the same `code`, but has updated
 *    `severity` and `reason`, while `actor_type`, `active`, `created_at` and
 *    `deleted_at` remain unchanged and `updated_at` reflects the modification.
 */
export async function test_api_admin_account_risk_flag_update_reason_and_severity_for_existing_code(
  connection: api.IConnection,
) {
  // 1. Register an admin using POST /auth/admin/join.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an initial risk flag with stable code, medium severity, and reason.
  const initialCode = "HIGH_REFUND_RATE";
  const initialSeverity = "medium";
  const initialReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });

  const createBody = {
    actor_type: "customer",
    code: initialCode,
    severity: initialSeverity,
    reason: initialReason,
    active: true,
    // Let expires_at be undefined for a non-expiring flag
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const originalFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(originalFlag);

  // Sanity checks on the created flag
  TestValidator.equals(
    "created flag uses requested code",
    originalFlag.code,
    initialCode,
  );
  TestValidator.equals(
    "created flag uses requested severity",
    originalFlag.severity,
    initialSeverity,
  );
  TestValidator.equals(
    "created flag uses requested reason",
    originalFlag.reason ?? null,
    initialReason,
  );
  TestValidator.equals(
    "created flag active is true",
    originalFlag.active,
    true,
  );

  // 3. Update the risk flag by changing severity and reason only.
  const updatedSeverity = "high";
  const updatedReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });

  const updateBody = {
    // code omitted on purpose to keep it unchanged
    severity: updatedSeverity,
    reason: updatedReason,
    // leave actor_type, active, expires_at undefined so they remain unchanged
  } satisfies IShoppingMallAccountRiskFlag.IUpdate;

  const updatedFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.update(
      connection,
      {
        riskFlagId: originalFlag.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFlag);

  // 4. Business assertions after update.
  // Code should remain unchanged.
  TestValidator.equals(
    "risk code remains unchanged after update",
    updatedFlag.code,
    originalFlag.code,
  );

  // Severity should be updated.
  TestValidator.equals(
    "severity updated to new value",
    updatedFlag.severity,
    updatedSeverity,
  );
  TestValidator.notEquals(
    "severity differs from original",
    updatedFlag.severity,
    originalFlag.severity,
  );

  // Reason should be updated.
  TestValidator.equals(
    "reason updated to new value",
    updatedFlag.reason ?? null,
    updatedReason,
  );
  TestValidator.notEquals(
    "reason differs from original",
    updatedFlag.reason ?? null,
    originalFlag.reason ?? null,
  );

  // actor_type and active should remain the same.
  TestValidator.equals(
    "actor_type remains the same",
    updatedFlag.actor_type,
    originalFlag.actor_type,
  );
  TestValidator.equals(
    "active flag remains the same",
    updatedFlag.active,
    originalFlag.active,
  );

  // created_at should remain unchanged, updated_at should change or at least not be earlier.
  TestValidator.equals(
    "created_at remains unchanged",
    updatedFlag.created_at,
    originalFlag.created_at,
  );

  // Compare updated_at logically using Date; updated_at should not be before original updated_at.
  const originalUpdatedAtTime = new Date(originalFlag.updated_at).getTime();
  const newUpdatedAtTime = new Date(updatedFlag.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is not earlier than original updated_at",
    newUpdatedAtTime >= originalUpdatedAtTime,
  );

  // deleted_at should remain unchanged (for a fresh flag, likely null).
  TestValidator.equals(
    "deleted_at remains unchanged",
    updatedFlag.deleted_at ?? null,
    originalFlag.deleted_at ?? null,
  );
}
