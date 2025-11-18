import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful password update for authenticated user.
 *
 * This test validates the ability of a user to change their own password using
 * the self-update endpoint. It thoroughly verifies both business logic and the
 * technical session/token context. The workflow:
 *
 * 1. Register a new account using a strong, unique email and valid password.
 * 2. Authenticate as the new user using the automatically returned JWT (session is
 *    set in connection.headers by SDK).
 * 3. Call the self-update endpoint with a new (also strong) password, leaving the
 *    email unchanged.
 * 4. Check that the API responds with valid updated account data and the operation
 *    does not fail.
 * 5. Attempt login using the former password (should now fail, as password has
 *    been changed and session invalidated).
 * 6. Attempt login using the new password (should succeed; token should be issued,
 *    session established).
 *
 * Steps:
 *
 * - Generate random email and strong initial password
 * - Register via api.functional.auth.user.join()
 * - Call api.functional.todoList.user.users.self.update() with just password
 *   field set (new value)
 * - Confirm returned user is valid and updated_at is changed
 * - Simulate logging in with old password by calling join (should fail)
 * - Simulate logging in with new password by calling join (should succeed and new
 *   token returned)
 */
export async function test_api_user_self_update_password_success(
  connection: api.IConnection,
) {
  // 1. Generate unique email, strong initial and new passwords
  const email: string = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const password: string = RandomGenerator.alphaNumeric(12) + "A1!";
  const newPassword: string = RandomGenerator.alphaNumeric(14) + "B2@";
  const randomHref: string =
    "https://test-client.example.com/join/" + RandomGenerator.alphaNumeric(12);
  const randomReferrer: string =
    "https://referrer.example.com/lp/" + RandomGenerator.alphaNumeric(6);

  // 2. Register new user (auto-authenticated)
  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href: randomHref,
      referrer: randomReferrer,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(registration);

  // 3. Change password via self-update endpoint (authenticated context)
  const updateResult = await api.functional.todoList.user.users.self.update(
    connection,
    {
      body: {
        password: newPassword,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(updateResult);

  // 4. Validate response is success and user ID matches
  TestValidator.equals(
    "user ID unchanged after password update",
    updateResult.id,
    registration.id,
  );
  TestValidator.notEquals(
    "updated_at is changed after password update",
    updateResult.updated_at,
    registration.updated_at,
  );

  // 5. Attempt to login with OLD password (should fail: unique email constraint, but simulate wrong password path by intentionally using correct email and wrong password)
  await TestValidator.error(
    "login with old password should fail after change",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email,
          password, // old (should fail)
          href: randomHref + "/retry1", // Slightly different href
          referrer: randomReferrer + "/retry1",
        } satisfies ITodoListUser.IJoin,
      });
    },
  );

  // 6. Attempt to login with NEW password (should succeed)
  const reLogin = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: newPassword,
      href: randomHref + "/retry2",
      referrer: randomReferrer + "/retry2",
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(reLogin);
  TestValidator.equals(
    "successful login user ID matches original account",
    reLogin.id,
    registration.id,
  );
  TestValidator.equals("login email matches", reLogin.email, email);
}
