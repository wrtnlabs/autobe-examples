import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRoleEscalation";

/**
 * Validates that a platform admin can update status, notes, and reviewer
 * information for a specific privilege escalation (role escalation) entry in
 * the audit log.
 *
 * 1. Register and authenticate a new admin account
 * 2. Prepare a mock role escalation record for testing (simulate or use random
 *    values)
 * 3. Call the role escalation status update API as the admin
 * 4. Set new status, reviewer comments, processed/decisioned timestamp, and
 *    processor admin
 * 5. Verify the update is atomic and details are updated in the resulting entity
 * 6. Ensure admin attribution (processed_by_admin_id) matches admin actor
 * 7. All DTO type assertions and business logic validation
 */
export async function test_api_role_escalation_status_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin account
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare a mock role escalation record for testing
  const baseRoleEscalation: IShoppingMallRoleEscalation =
    typia.random<IShoppingMallRoleEscalation>();
  typia.assert(baseRoleEscalation);

  // 3. Call the update endpoint as admin
  const now = new Date().toISOString();
  const updateBody = {
    status: RandomGenerator.pick([
      "approved",
      "rejected",
      "under_review",
    ] as const),
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    processed_by_admin_id: admin.id,
    processed_at: now,
  } satisfies IShoppingMallRoleEscalation.IUpdate;

  const updated: IShoppingMallRoleEscalation =
    await api.functional.shoppingMall.admin.roleEscalations.update(connection, {
      roleEscalationId: baseRoleEscalation.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Validate business logic and attribute correctness
  TestValidator.equals(
    "status should be updated atomically",
    updated.status,
    updateBody.status,
  );
  TestValidator.equals(
    "reason (reviewer comments) should update",
    updated.reason,
    updateBody.reason,
  );
  TestValidator.equals(
    "processed_by_admin_id should be set to acting admin",
    updated.processed_by_admin_id,
    admin.id,
  );
  TestValidator.equals(
    "processed_at timestamp should be updated",
    updated.processed_at,
    now,
  );
}
