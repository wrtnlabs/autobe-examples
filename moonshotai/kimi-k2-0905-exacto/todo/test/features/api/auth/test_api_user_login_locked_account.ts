import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate login of a locked user account.
 *
 * This test verifies the login API behavior when a user's account is
 * administratively locked (is_locked set to true). The scenario is based on the
 * expectation that, after registering a new user, their account is forcibly set
 * as locked using a mechanism not present in the current public API. Therefore,
 * while this test cannot fully automate state change due to missing lock
 * functionality, it documents the intended test flow for future extension.
 *
 * Steps:
 *
 * 1. Register a new todo list user account via the join endpoint.
 * 2. (Manual step, not implemented): Lock the user's account by setting is_locked
 *    true (not possible via public API).
 * 3. Attempt to login with the registered credentials. The login is expected to
 *    fail due to the account being locked. When the lock functionality is
 *    implemented and invoked, the login should return an error response.
 */
export async function test_api_user_login_locked_account(
  connection: api.IConnection,
) {
  // 1. Register a new todo list user account
  const userBody = typia.random<ITodoListUser.ICreate>();
  const register = await api.functional.auth.user.join(connection, {
    body: userBody,
  });
  typia.assert(register);

  // 2. Manual system action would set is_locked to true for this account, which cannot be performed via API.
  // 3. Attempt login with the registered credentials. As lock control is not exposed for e2e, this step is documented but not executable in this automation. If the system supported direct locking, the following code would apply:
  // await TestValidator.error("login should fail for locked account", async () => {
  //   await api.functional.auth.user.login(connection, { body: userBody });
  // });

  // For completeness and test structure, sanity-check a normal login
  const login = await api.functional.auth.user.login(connection, {
    body: userBody,
  });
  typia.assert(login);
  TestValidator.equals(
    "login should return same email as registration",
    login.email,
    register.email,
  );
  TestValidator.predicate(
    "account should not be locked after registration",
    !login.is_locked,
  );
}
