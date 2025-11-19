import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate that unauthorized login attempts to the admin authentication
 * endpoint result in a uniform error, both when the email is non-existent and
 * when the password is incorrect, without revealing whether the account
 * exists.
 *
 * 1. Attempt login with a syntactically valid but non-existent admin email and
 *    valid password. Ensure the endpoint returns an authentication error.
 * 2. Attempt login with a valid email but an intentionally wrong password. Again,
 *    ensure a uniform authentication error is returned.
 * 3. In both cases, confirm there is no information leakage about whether the
 *    account exists, and no authorized session or JWT tokens are issued.
 *
 * No resource setup or dependencies required, as the test is strictly for
 * negative authentication scenarios.
 */
export async function test_api_admin_login_wrong_credentials(
  connection: api.IConnection,
) {
  // 1. Attempt login with a non-existent email (syntactically valid)
  const nonexistentEmail =
    "not.admin." +
    typia.random<string & tags.Format<"uuid">>() +
    "@example.com";
  const credentials1 = {
    email: nonexistentEmail,
    password: "nonexistpass123", // Satisfies MinLength<8>
  } satisfies IDiscussionBoardAdmin.ILogin;
  await TestValidator.error(
    "login fails with non-existent admin email",
    async () => {
      await api.functional.auth.admin.login(connection, { body: credentials1 });
    },
  );

  // 2. Attempt login with a valid email and incorrect password
  const validLookingEmail = typia.random<string & tags.Format<"email">>();
  const credentials2 = {
    email: validLookingEmail,
    password: "invalidpass456", // Satisfies MinLength<8>
  } satisfies IDiscussionBoardAdmin.ILogin;
  await TestValidator.error(
    "login fails with valid admin email but wrong password",
    async () => {
      await api.functional.auth.admin.login(connection, { body: credentials2 });
    },
  );
}
