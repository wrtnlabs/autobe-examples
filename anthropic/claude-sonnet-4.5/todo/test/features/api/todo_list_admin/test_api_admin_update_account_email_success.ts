import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Successfully updates an administrator account's email with a new unique
 * address.
 *
 * 1. Register a new admin (join) to get an authentication context and the initial
 *    admin info
 * 2. Update the admin's email using the update endpoint to a new valid, unique
 *    email address
 * 3. Assert the response contains the exact updated email, and the admin's id
 *    remains unchanged
 * 4. Confirm no compliance/audit errors are triggered (no error thrown, successful
 *    update)
 */
export async function test_api_admin_update_account_email_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: originalEmail,
    password,
    href: "https://admin-portal.todolist-app.com/register",
    referrer: "https://admin-portal.todolist-app.com/",
  } satisfies ITodoListAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(adminAuthorized);
  const adminId = adminAuthorized.id;

  // 2. Update the admin's email to a new unique one
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateBody = {
    email: newEmail,
  } satisfies ITodoListAdmin.IUpdate;
  const updatedAdmin = await api.functional.todoList.admin.admins.update(
    connection,
    {
      adminId: adminId,
      body: updateBody,
    },
  );
  typia.assert(updatedAdmin);

  // 3. Assert response contains the new email, id remains unchanged
  TestValidator.equals(
    "updated admin email must match new requested email",
    updatedAdmin.email,
    newEmail,
  );
  TestValidator.equals(
    "admin id should stay the same after update",
    updatedAdmin.id,
    adminId,
  );

  // 4. Confirm no compliance error: if update succeeded, no error thrown, nothing else to assert (success path)
}
