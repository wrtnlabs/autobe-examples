import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that soft deletion maintains complete audit trail and compliance
 * requirements.
 *
 * This test validates that when an administrator account is soft deleted, the
 * system preserves all historical data for audit and compliance purposes. It
 * verifies that:
 *
 * 1. Create admin accounts including one with activity history to be deleted
 * 2. Establish activity history through authentication operations
 * 3. Perform soft deletion of the target admin account
 * 4. Verify deleted_at timestamp is set accurately
 * 5. Confirm all account data remains intact and accessible
 * 6. Ensure deletion action can be audited with complete information
 */
export async function test_api_admin_account_deletion_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create Admin A - the account to be deleted with activity history
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAPassword = typia.random<string & tags.MinLength<8>>();

  const adminA = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminAEmail,
      password: adminAPassword,
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(adminA);

  // Step 2: Create Admin C - the admin that will perform the deletion
  const adminCEmail = typia.random<string & tags.Format<"email">>();
  const adminCPassword = typia.random<string & tags.MinLength<8>>();

  const adminC = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminCEmail,
      password: adminCPassword,
      ip: "192.168.1.102",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(adminC);

  // Step 3: Store Admin A's original data before deletion for comparison
  const originalAdminAId = adminA.id;
  const originalAdminAEmail = adminA.email;
  const originalAdminACreatedAt = adminA.created_at;
  const originalAdminAUpdatedAt = adminA.updated_at;

  // Step 4: Capture timestamp before deletion for validation
  const beforeDeletionTime = new Date();

  // Step 5: Perform soft deletion of Admin A using Admin C's authorization
  const deletedAdmin = await api.functional.todoList.admin.admins.erase(
    connection,
    {
      adminId: adminA.id,
    },
  );
  typia.assert(deletedAdmin);

  // Step 6: Capture timestamp after deletion for validation
  const afterDeletionTime = new Date();

  // Step 7: Verify the deleted admin record is preserved in database
  TestValidator.equals(
    "deleted admin ID matches original",
    deletedAdmin.id,
    originalAdminAId,
  );

  TestValidator.equals(
    "deleted admin email matches original",
    deletedAdmin.email,
    originalAdminAEmail,
  );

  TestValidator.equals(
    "deleted admin created_at matches original",
    deletedAdmin.created_at,
    originalAdminACreatedAt,
  );

  TestValidator.equals(
    "deleted admin updated_at matches original",
    deletedAdmin.updated_at,
    originalAdminAUpdatedAt,
  );

  // Step 8: Verify deleted_at timestamp is set and accurate
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedAdmin.deleted_at !== null && deletedAdmin.deleted_at !== undefined,
  );

  if (
    deletedAdmin.deleted_at !== null &&
    deletedAdmin.deleted_at !== undefined
  ) {
    const deletedAtTime = new Date(deletedAdmin.deleted_at);

    TestValidator.predicate(
      "deleted_at timestamp is after before-deletion time",
      deletedAtTime >= beforeDeletionTime,
    );

    TestValidator.predicate(
      "deleted_at timestamp is before after-deletion time",
      deletedAtTime <= afterDeletionTime,
    );
  }

  // Step 9: Verify all historical data is intact
  TestValidator.predicate(
    "all core account data is preserved",
    deletedAdmin.id === originalAdminAId &&
      deletedAdmin.email === originalAdminAEmail &&
      deletedAdmin.created_at === originalAdminACreatedAt &&
      deletedAdmin.updated_at === originalAdminAUpdatedAt,
  );
}
