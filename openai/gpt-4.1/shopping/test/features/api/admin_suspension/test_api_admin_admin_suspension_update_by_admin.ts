import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSuspension";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validate updating admin suspension records by a privileged admin.
 *
 * Scenario:
 *
 * 1. Register a new admin and authenticate.
 * 2. Create an initial admin suspension for an admin actor.
 * 3. Update the suspension: change status (e.g., from active to revoked), update
 *    reason, and modify the end date in the case of a temporary suspension.
 * 4. Confirm response reflects the requested update and business rules are
 *    respected.
 * 5. Negative test: attempt an illegal update (e.g., unlock a permanent suspension
 *    without justification) and confirm that the system rejects the operation.
 *
 * Implementation Details:
 *
 * - Randomize admin identity and target to ensure test isolation.
 * - For required IDs, use values from admin creation.
 * - For updates, use IShoppingAdminSuspension.IUpdate (partial update possible).
 * - Confirm that updated fields take effect; assert with TestValidator and
 *   typia.assert.
 * - Assert that the audit trail (created_at/updated_at) is logically consistent.
 * - Attempt business-rule-violating update (e.g., changing permanent ban to
 *   active with no end_at), expect rejection via TestValidator.error.
 */
export async function test_api_admin_admin_suspension_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Create a new suspension on the registering admin as target (self-suspension allowed for test)
  const suspensionCreateBody = {
    admin_id: adminAuth.id,
    suspended_admin_id: adminAuth.id,
    suspended_seller_id: null,
    suspended_customer_id: null,
    suspension_type: "temporary",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    status: "active",
  } satisfies IShoppingAdminSuspension.ICreate;
  const suspension =
    await api.functional.shopping.admin.adminSuspensions.create(connection, {
      body: suspensionCreateBody,
    });
  typia.assert(suspension);
  TestValidator.equals(
    "admin is actor of suspension",
    suspension.admin_id,
    adminAuth.id,
  );
  TestValidator.equals(
    "suspended admin",
    suspension.suspended_admin_id,
    adminAuth.id,
  );
  TestValidator.equals("status is active", suspension.status, "active");
  TestValidator.equals(
    "suspension_type is temporary",
    suspension.suspension_type,
    "temporary",
  );

  // 3. Update the suspension: status to revoked, new end_at, updated reason
  const updateBody = {
    status: "revoked",
    end_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Extend ban by another week
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingAdminSuspension.IUpdate;
  const updated = await api.functional.shopping.admin.adminSuspensions.update(
    connection,
    {
      adminSuspensionId: suspension.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals("suspension id should match", updated.id, suspension.id);
  TestValidator.equals("status updated to revoked", updated.status, "revoked");
  TestValidator.equals("end_at changed", updated.end_at, updateBody.end_at);
  TestValidator.equals("reason updated", updated.reason, updateBody.reason);
  TestValidator.predicate(
    "updated_at is newer or equal to created_at",
    new Date(updated.updated_at).getTime() >=
      new Date(updated.created_at).getTime(),
  );

  // 4. Attempt to unlock a permanent suspension without justification (should fail)
  // First, set to permanent
  const setPermanent = {
    suspension_type: "permanent",
    status: "active",
    end_at: null,
    reason: "Serious policy violation",
  } satisfies IShoppingAdminSuspension.IUpdate;
  const permanent = await api.functional.shopping.admin.adminSuspensions.update(
    connection,
    {
      adminSuspensionId: suspension.id,
      body: setPermanent,
    },
  );
  typia.assert(permanent);
  TestValidator.equals("now permanent", permanent.suspension_type, "permanent");
  TestValidator.equals("end_at is null for permanent", permanent.end_at, null);

  // Try to set status to active (improper unlock attempt)
  await TestValidator.error(
    "cannot unlock permanent suspension without justification",
    async () => {
      await api.functional.shopping.admin.adminSuspensions.update(connection, {
        adminSuspensionId: suspension.id,
        body: {
          status: "active", // try to reactivate
          end_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // A day later
        } satisfies IShoppingAdminSuspension.IUpdate,
      });
    },
  );
}
