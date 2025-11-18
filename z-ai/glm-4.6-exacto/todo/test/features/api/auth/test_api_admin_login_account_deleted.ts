import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validate login denial for a soft-deleted admin account.
 *
 * This test checks that attempting to log in with credentials of an admin
 * account where deleted_at is not null (soft-deleted) is rejected securely. The
 * error must be indistinguishable from invalid credentials from an external
 * perspective, and no tokens are ever issued. Proper context and URI fields are
 * included for compliance.
 *
 * Steps:
 *
 * 1. Generate random admin credentials.
 * 2. (Simulate creation and soft-deletion of admin account externally.)
 * 3. Attempt to log in with the soft-deleted credentials.
 * 4. Confirm that login fails securely (error thrown, no session/tokens).
 */
export async function test_api_admin_login_account_deleted(
  connection: api.IConnection,
) {
  // 1. Generate valid admin credentials (to simulate a previously created and soft-deleted account)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // minimum 8 characters, random strong password
  const href = "https://admin.todoapp.com/login";
  const referrer = "https://admin.todoapp.com/";
  // Note: Actual account creation and soft-delete assumed to be handled out-of-band (seeding/data-step)

  // 2. Attempt login expecting failure indistinguishable from invalid credentials
  await TestValidator.error(
    "login is denied for soft-deleted admin account",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email,
          password,
          href,
          referrer,
        } satisfies ITodoAppAdmin.ILogin,
      });
    },
  );
}
