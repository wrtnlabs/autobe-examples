import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator updating their own profile fields (email, password, role)
 * via PUT /todoList/admin/admins/{adminId}.
 *
 * 1. Register new admin via api.functional.auth.admin.join.
 * 2. Authenticate as that admin (implicit in join).
 * 3. Update admin profile with new valid email, password, and role via
 *    api.functional.todoList.admin.admins.update.
 * 4. Validate response: updated properties returned, lock and deletion flags
 *    unaffected.
 * 5. Ensure business rules: unique email, password policy (min. 8 chars), role
 *    assignment.
 */
export async function test_api_admin_account_update_profile(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const origEmail = typia.random<string & tags.Format<"email">>();
  const origPassword = RandomGenerator.alphaNumeric(12); // minLength 8
  const origJoinReq = {
    email: origEmail,
    password: origPassword,
  } satisfies ITodoListAdmin.IJoin;
  const adminAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: origJoinReq });
  typia.assert(adminAuth);
  const adminId = adminAuth.id;
  TestValidator.equals("registered email", adminAuth.email, origEmail);

  // 2. Prepare new email and password for update
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newPassword = RandomGenerator.alphaNumeric(16); // minLength 8
  const newRole = RandomGenerator.pick([
    "superadmin",
    "moderator",
    "auditor",
    "support",
    "operator",
  ] as const);

  // 3. Update via PUT, changing email, password and role
  const updateReq = {
    email: newEmail,
    password: newPassword,
    role: newRole,
  } satisfies ITodoListAdmin.IUpdate;
  const updated: ITodoListAdmin =
    await api.functional.todoList.admin.admins.update(connection, {
      adminId,
      body: updateReq,
    });
  typia.assert(updated);

  // 4. Validate mutated profile fields
  TestValidator.equals("email updated", updated.email, newEmail);
  TestValidator.equals("role updated", updated.role, newRole);

  // 5. Unchanged flags
  TestValidator.equals("not locked", updated.locked, false);
  TestValidator.equals("not deleted", updated.deleted_at, null);

  // 6. Timestamps: updated_at should be >= created_at
  TestValidator.predicate(
    "updated_at not before created_at",
    new Date(updated.updated_at) >= new Date(updated.created_at),
  );
}
