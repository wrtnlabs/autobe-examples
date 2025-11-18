import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verifies retrieval of an individual user's public profile via unique userId.
 *
 * 1. Register a new user using the join endpoint and obtain their userId.
 * 2. Retrieve the user's profile using the /todoList/users/{userId} endpoint.
 *
 *    - Confirm that the returned object's id, email, created_at, updated_at, and
 *         disabled_at match the registered user.
 *    - Confirm that sensitive fields such as passwords are not present.
 * 3. Attempt retrieval with a non-existent userId and verify an error is returned.
 */
export async function test_api_todo_list_user_public_profile_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ITodoListUser.IJoin;
  const registered: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinRequest,
    });
  typia.assert(registered);

  // 2. Retrieve the user's public profile by id
  const user: ITodoListUser = await api.functional.todoList.users.at(
    connection,
    {
      userId: registered.id,
    },
  );
  typia.assert(user);

  // Confirm profile fields
  TestValidator.equals("id matches", user.id, registered.id);
  TestValidator.equals("email matches", user.email, joinRequest.email);
  TestValidator.equals(
    "created_at matches",
    user.created_at,
    registered.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    user.updated_at,
    registered.updated_at,
  );
  TestValidator.equals(
    "disabled_at matches",
    user.disabled_at,
    registered.disabled_at,
  );

  // Confirm that sensitive fields are not present
  TestValidator.predicate(
    "password hash should not be present",
    !("password_hash" in user),
  );

  // 3. Retrieval with a non-existent userId yields error
  const fakeUserId = typia.random<string & tags.Format<"uuid">>();
  // Ensure fakeUserId is not the one just registered
  if (fakeUserId === registered.id) {
    // If by chance, regenerate
    return await test_api_todo_list_user_public_profile_retrieval(connection);
  }
  await TestValidator.error(
    "retrieval of non-existent user profile results in error",
    async () => {
      await api.functional.todoList.users.at(connection, {
        userId: fakeUserId,
      });
    },
  );
}
