import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test privilege escalation for admin accounts (role update: e.g., moderator →
 * superadmin)
 *
 * 1. Register a new admin with lower privilege ('moderator' role assumed as
 *    lowest)
 * 2. Authenticate as the created admin (token is managed by SDK)
 * 3. Update admin's role via PUT to 'superadmin' (escalaion)
 * 4. Validate new role, updated_at increases, and other immutable fields are
 *    retained
 * 5. Validate that another privileged account with same role/unique constraints
 *    cannot exist (if applicable)
 */
export async function test_api_admin_account_update_role_privilege_escalation(
  connection: api.IConnection,
) {
  // Step 1: Register admin with the lowest privilege role (e.g., 'moderator')
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> = typia.random<
    string & tags.MinLength<8>
  >();

  // Initial join: role on registration is system-determined, so default as low privilege
  const moderator: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoListAdmin.IJoin,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "registered admin email matches",
    moderator.email,
    email,
  );
  TestValidator.equals("initial locked is false", moderator.locked, false);
  // Ensure currently not already superadmin
  TestValidator.notEquals(
    "initial role is not superadmin",
    moderator.role,
    "superadmin",
  );

  // Step 2: Update the admin's role to a higher privilege (e.g., 'superadmin')
  const newRole = "superadmin";
  const updateBody = { role: newRole } satisfies ITodoListAdmin.IUpdate;
  const beforeUpdatedAt = moderator.updated_at;

  // Step 3: Perform the privilege escalation via PUT
  const updated: ITodoListAdmin =
    await api.functional.todoList.admin.admins.update(connection, {
      adminId: moderator.id,
      body: updateBody,
    });
  typia.assert(updated);

  // Step 4: Validate updated fields
  TestValidator.equals(
    "role is escalated to superadmin",
    updated.role,
    newRole,
  );
  TestValidator.notEquals(
    "updated_at is changed after escalation",
    updated.updated_at,
    beforeUpdatedAt,
  );
  TestValidator.equals("admin id remains the same", updated.id, moderator.id);
  TestValidator.equals(
    "email unchanged after update",
    updated.email,
    moderator.email,
  );
  TestValidator.equals(
    "locked property unchanged",
    updated.locked,
    moderator.locked,
  );
  // created_at should remain unchanged
  TestValidator.equals(
    "created_at property unchanged",
    updated.created_at,
    moderator.created_at,
  );
  TestValidator.equals(
    "deleted_at property unchanged",
    updated.deleted_at,
    moderator.deleted_at,
  );
  // Optionally, ensure uniqueness/audit business rule validations if response allows observation
}
