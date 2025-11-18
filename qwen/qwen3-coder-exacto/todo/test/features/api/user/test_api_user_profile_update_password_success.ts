import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating the user's password.
 *
 * Scenario steps:
 *
 * 1. Register a new user to obtain valid credentials (email + password).
 * 2. Update the user's profile with a new password using the update endpoint.
 * 3. Ensure password change is accepted, and no password or hashes are ever leaked
 *    in the API response.
 * 4. Confirm the 'updated_at' timestamp is refreshed when password changes.
 * 5. Validate that authentication is required for updates by attempting an
 *    unauthenticated call (expect error).
 */
export async function test_api_user_profile_update_password_success(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
    href: "https://localhost/join",
    referrer: "https://localhost/landing",
  } satisfies ITodoListUser.ICreate;
  const userAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(userAuth);

  // 2. Update the user's profile with a new password via the update endpoint
  const newPassword = RandomGenerator.alphaNumeric(16);
  const updateBody = {
    password: newPassword,
  } satisfies ITodoListUser.IUpdate;
  const updatedUser: ITodoListUser =
    await api.functional.todoList.user.users.update(connection, {
      userId: userAuth.id,
      body: updateBody,
    });
  typia.assert(updatedUser);

  // 3. Ensure no 'password' or hashes are leaked in the response
  TestValidator.predicate(
    "no password or hash fields leaked in updated user profile",
    !Object.keys(updatedUser).some(
      (key) =>
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("hash"),
    ),
  );

  // 4. Confirm 'updated_at' timestamp is refreshed
  TestValidator.predicate(
    "updated_at timestamp is refreshed",
    updatedUser.updated_at > userAuth.updated_at,
  );

  // 5. Validate that authentication is required for updates
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "password update requires authentication",
    async () => {
      await api.functional.todoList.user.users.update(unauthConn, {
        userId: userAuth.id,
        body: updateBody,
      });
    },
  );
}
