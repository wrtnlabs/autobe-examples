import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates permanent user account deletion workflow.
 *
 * This end-to-end test simulates registering a new user, authenticating,
 * invoking the erasure endpoint `/auth/user/erase-account`, and then ensures
 * all traces of the user are irreversibly deleted. The test also verifies that
 * re-login is impossible and that authentication is required for account
 * erasure.
 *
 * Steps:
 *
 * 1. Register a new user account
 * 2. Authenticate as the new user
 * 3. Delete the user's account using the erasure endpoint
 * 4. Verify response contains { success: true }
 * 5. Assert the same credentials cannot be used to login afterward
 * 6. Assert unauthenticated deletion attempt fails (auth required)
 */
export async function test_api_todo_list_user_account_erasure_complete_flow(
  connection: api.IConnection,
) {
  // 1. Register new user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const displayName: string & tags.MinLength<1> & tags.MaxLength<64> =
    RandomGenerator.paragraph({ sentences: 2 });
  const href = "https://e2e-todo.test/register";
  const referrer = "https://e2e-todo.test/";

  const joinRequest = {
    email,
    password,
    display_name: displayName,
    href,
    referrer,
  } satisfies ITodoListUser.IJoin;
  const joinResult = await api.functional.auth.user.join(connection, {
    body: joinRequest,
  });
  typia.assert(joinResult);

  // Mock email verification step - direct activation for E2E (skip for now)
  // log in: must succeed after join since "verified" in E2E
  const loginRequest = {
    email,
    password,
    href: "https://e2e-todo.test/login",
    referrer: "https://e2e-todo.test/register",
  } satisfies ITodoListUser.ILogin;
  const loginResult = await api.functional.auth.user.login(connection, {
    body: loginRequest,
  });
  typia.assert(loginResult);

  // 3. User erases their account
  const deletionResult =
    await api.functional.auth.user.erase_account.eraseAccount(connection);
  typia.assert(deletionResult);
  TestValidator.predicate(
    "deletion result success flag is true",
    deletionResult.success === true,
  );

  // 4. Cannot login with same credentials (account no longer exists or is disabled)
  await TestValidator.error(
    "cannot login with deleted credentials",
    async () => {
      await api.functional.auth.user.login(connection, { body: loginRequest });
    },
  );

  // 5. Unauthenticated - fresh connection, cannot erase account
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "erase-account throws error if not authenticated",
    async () => {
      await api.functional.auth.user.erase_account.eraseAccount(
        unauthConnection,
      );
    },
  );
}
