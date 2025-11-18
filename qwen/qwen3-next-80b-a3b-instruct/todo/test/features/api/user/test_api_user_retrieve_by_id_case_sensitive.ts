import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_case_sensitive(
  connection: api.IConnection,
) {
  // Step 1: Create a new user with a mixed-case userId
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "SecurePass123!";

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Step 2: Validate that retrieving the user with exact case works
  const retrievedUserExact: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: createdUser.id, // Using the exact case returned from join
    });
  typia.assert(retrievedUserExact);
  TestValidator.equals(
    "retrieved user matches created user",
    retrievedUserExact,
    createdUser.id,
  );

  // Step 3: Test case sensitivity by attempting retrieval with altered case
  // Convert userId to all lowercase for invalid case test
  const lowerCaseUserId = createdUser.id.toLowerCase();
  await TestValidator.error(
    "case-sensitive retrieval should fail with lowercase userId",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: lowerCaseUserId,
      });
    },
  );

  // Convert userId to all uppercase for invalid case test
  const upperCaseUserId = createdUser.id.toUpperCase();
  await TestValidator.error(
    "case-sensitive retrieval should fail with uppercase userId",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: upperCaseUserId,
      });
    },
  );

  // Convert userId with mixed case for invalid case test
  const mixedCaseUserId =
    createdUser.id.charAt(0).toUpperCase() +
    createdUser.id.slice(1).toLowerCase();
  await TestValidator.error(
    "case-sensitive retrieval should fail with mixed-case userId",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: mixedCaseUserId,
      });
    },
  );
}
