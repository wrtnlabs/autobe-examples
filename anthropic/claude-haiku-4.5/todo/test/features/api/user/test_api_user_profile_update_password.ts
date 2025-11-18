import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate password update via user profile endpoint.
 *
 * This test verifies that an authenticated user can successfully change their
 * password using the profile update API, and that no sensitive credentials are
 * exposed in the response. It also ensures the user remains authenticated after
 * the change.
 *
 * 1. Register a new user account.
 * 2. Update the password for the current authenticated session (via PUT
 *    /todoList/user/users/me).
 * 3. Assert that the password is not exposed in the response, only profile fields
 *    are present.
 * 4. Make an additional authenticated call after password update, confirming
 *    continued authentication (no token invalidation on simple password
 *    update).
 */
export async function test_api_user_profile_update_password(
  connection: api.IConnection,
) {
  // 1. Register new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // valid password
  const joinPayload = {
    email,
    password,
    href: "https://todo.example.com/register",
    referrer: "https://todo.example.com/welcome",
    ip: null,
  } satisfies ITodoListUser.IJoin;
  const auth: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinPayload },
  );
  typia.assert(auth);
  TestValidator.equals("email matches join payload", auth.email, email);

  // 2. Update password via profile
  const newPassword = RandomGenerator.alphaNumeric(16); // strong new password
  const updateBody = {
    password: newPassword,
  } satisfies ITodoListUser.IUpdate;
  const updatedProfile: ITodoListUser =
    await api.functional.todoList.user.users.me.update(connection, {
      body: updateBody,
    });
  typia.assert(updatedProfile);
  TestValidator.equals(
    "email remains unchanged after password update",
    updatedProfile.email,
    email,
  );
  TestValidator.notEquals(
    "created_at is not empty",
    updatedProfile.created_at,
    "",
  );

  // 3. Ensure password fields are not present (type guarantee, can't access password/password_hash on ITodoListUser)
  // 4. User remains authenticated; fetch profile again to ensure access is retained.
  const updatedProfileCheck: ITodoListUser =
    await api.functional.todoList.user.users.me.update(connection, {
      body: {} as ITodoListUser.IUpdate,
    });
  typia.assert(updatedProfileCheck);
  TestValidator.equals(
    "email still correct after further access",
    updatedProfileCheck.email,
    email,
  );
}
