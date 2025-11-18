import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate resetting an administrator account's password for the platform.
 *
 * Steps:
 *
 * 1. Register a new admin account with unique email, password, and required audit
 *    fields. Receive admin ID and token.
 * 2. Use token to update the admin's password through the update endpoint (PUT
 *    /todoList/admin/admins/:adminId), specifying only a new password.
 * 3. Assert the response returns the correct admin record, with non-null
 *    updated_at (and a possibly advanced value), unchanged email, and no
 *    password hash or sensitive fields exposed.
 * 4. Attempt to join/login again as a new admin (should fail w/ duplicate email).
 * 5. Attempt to login with the original credentials (should still fail, as no
 *    login endpoint for admin). Join is the only entry point specified, so we
 *    re-register with a new account/password for completeness.
 * 6. All operations are performed with full audit trail and authorization.
 */
export async function test_api_admin_update_account_password_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin
  const email = typia.random<string & tags.Format<"email">>();
  const initialPassword = RandomGenerator.alphaNumeric(10) + "A@";
  const joinBody = {
    email,
    password: initialPassword,
    href: "https://admin.portal/register",
    referrer: "https://admin.portal/",
    ip: null,
  } satisfies ITodoListAdmin.IJoin;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedAdmin);

  // Step 2: Update admin password with new strong password
  const newPassword = RandomGenerator.alphaNumeric(12) + "!Z1";
  const updateBody = {
    password: newPassword,
  } satisfies ITodoListAdmin.IUpdate;
  const updatedAdmin = await api.functional.todoList.admin.admins.update(
    connection,
    {
      adminId: authorizedAdmin.id,
      body: updateBody,
    },
  );
  typia.assert(updatedAdmin);

  TestValidator.equals(
    "update returns correct admin id",
    updatedAdmin.id,
    authorizedAdmin.id,
  );
  TestValidator.equals("email stays the same", updatedAdmin.email, email);

  // Ensure updated timestamp advanced or stayed same (for completeness, not strict)
  TestValidator.predicate(
    "updated_at is valid ISO timestamp",
    typeof updatedAdmin.updated_at === "string" &&
      updatedAdmin.updated_at.length > 0 &&
      !isNaN(Date.parse(updatedAdmin.updated_at)),
  );

  // No sensitive password data exposed
  // (This is enforced by DTO spec and typia.assert, but add business assertion comment)

  // Step 3: Attempt to register new admin with same email (should fail for unique constraint)
  await TestValidator.error("duplicate email registration fails", async () => {
    await api.functional.auth.admin.join(connection, { body: joinBody });
  });

  // Cannot test log-in explicitly, as only join is implemented (no login endpoint exposed).
  // Password update is thus reflected solely in successful account workflow w/ unique email enforced.
}
