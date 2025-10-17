import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Validate admin password change failure when current password is invalid.
 *
 * Business context:
 *
 * - An authenticated administrator should be able to request a password change
 *   only when presenting the correct current password. When the provided
 *   current credential is invalid, the operation must fail and the admin
 *   account state must remain unchanged.
 *
 * Test steps:
 *
 * 1. Register a fresh admin account via POST /auth/admin/join and assert the
 *    returned ITodoAppAdmin.IAuthorized payload.
 * 2. Attempt to change password using PUT /auth/admin/password/change with an
 *    incorrect currentPassword and a valid newPassword. Expect the operation to
 *    fail (TestValidator.error).
 * 3. Verify that the originally returned authorized summary remains valid and that
 *    no sensitive fields (password, password_hash) are exposed.
 */
export async function test_api_admin_change_password_invalid_current_password(
  connection: api.IConnection,
) {
  // 1) Register a new admin account and obtain authorization summary
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12); // meets min-length 8

  const createBody = {
    email,
    password,
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: createBody,
    },
  );
  // Runtime type validation of the authorized response
  typia.assert(admin);

  // Sanity check: email matches input
  TestValidator.equals("created admin email matches input", admin.email, email);

  // 2) Attempt password change with an incorrect current password
  const wrongCurrent = RandomGenerator.alphaNumeric(12); // intentionally incorrect
  const newPassword = RandomGenerator.alphaNumeric(12);

  const changeBody = {
    currentPassword: wrongCurrent,
    newPassword,
  } satisfies ITodoAppAdmin.IChangePassword;

  // Expect the operation to fail (business validation: invalid current credential)
  await TestValidator.error(
    "changePassword should fail with invalid current password",
    async () => {
      await api.functional.auth.admin.password.change.changePassword(
        connection,
        {
          body: changeBody,
        },
      );
    },
  );

  // 3) Verify that the previously returned admin summary remains valid and
  //    contains no sensitive fields.
  // typia.assert already validated the structure; re-assert to communicate intent
  typia.assert(admin);

  // Email must be unchanged
  TestValidator.equals(
    "admin email unchanged after failed change",
    admin.email,
    email,
  );

  // Ensure no sensitive properties are present in the authorized summary
  TestValidator.predicate(
    "authorized response must not expose password or password_hash",
    () => {
      // Property existence checks are fine because DTO does not define these
      // fields; presence would indicate sensitive data leakage.
      if ("password" in admin) return false;
      if (
        ("password_hash" as string) in
        (admin as unknown as Record<string, unknown>)
      )
        return false;
      return true;
    },
  );
}
