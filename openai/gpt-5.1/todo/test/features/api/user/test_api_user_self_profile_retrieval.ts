import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that an authenticated user can retrieve their own profile
 * information using the /todoList/user/users/self endpoint. The scenario checks
 * proper end-to-end isolation and security of user profile retrieval. Steps:
 *
 * 1. Register a brand new user account for the purpose of the test, using a unique
 *    random email and password that meet schema constraints. Other audit fields
 *    (href, referrer) are filled with realistic URIs. Save the output for later
 *    checks.
 * 2. Log in with the newly registered user's credentials (email, password, and
 *    context fields). Obtain the JWT token and authorized user output.
 * 3. Immediately invoke the /todoList/user/users/self endpoint as the
 *    authenticated user, ensuring Bearer authorization (handled by SDK
 *    automatically).
 * 4. Validate that the self-profile response correctly matches the registered
 *    user: all fields (id, email, created_at, updated_at, and optional
 *    deleted_at) must be present and correct, with no sensitive or extraneous
 *    data. Assert that id, email, and timestamps in the response match those
 *    issued at registration/login.
 * 5. For extra isolation, ensure that no other user's data appears in this
 *    response.
 */
export async function test_api_user_self_profile_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinInput = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<255>>(),
    href: "https://e2e.test/join",
    referrer: "https://e2e.test/referrer",
  } satisfies ITodoListUser.IJoin;
  const joinResult = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);

  // 2. Log in as this user
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password as string & tags.Format<"password">,
    href: "https://e2e.test/login",
    referrer: "https://e2e.test/login-referrer",
  } satisfies ITodoListUser.ILogin;
  const loginResult = await api.functional.auth.user.login(connection, {
    body: loginInput,
  });
  typia.assert(loginResult);

  // 3. Retrieve own profile
  const selfProfile =
    await api.functional.todoList.user.users.self.at(connection);
  typia.assert(selfProfile);

  // 4. Assert id, email, and timestamps match, and no sensitive data present
  TestValidator.equals(
    "self-profile id matches login",
    selfProfile.id,
    loginResult.id,
  );
  TestValidator.equals(
    "self-profile email matches login",
    selfProfile.email,
    loginResult.email,
  );
  TestValidator.equals(
    "self-profile created_at matches login",
    selfProfile.created_at,
    loginResult.created_at,
  );
  TestValidator.equals(
    "self-profile updated_at matches login",
    selfProfile.updated_at,
    loginResult.updated_at,
  );
  TestValidator.equals(
    "self-profile deleted_at matches login",
    selfProfile.deleted_at,
    loginResult.deleted_at,
  );

  // 5. Always validate that the self-profile output does not have token or password
  TestValidator.predicate(
    "self profile contains only allowed fields",
    Object.keys(selfProfile).every((k) =>
      ["id", "email", "created_at", "updated_at", "deleted_at"].includes(k),
    ),
  );
}
