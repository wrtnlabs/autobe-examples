import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that deleting a non-existent Todo returns an error for an authenticated
 * user.
 *
 * Business context:
 *
 * - Register a fresh user via POST /auth/user/join (ITodoAppUser.ICreate)
 * - Attempt to DELETE /todoApp/user/todos/{todoId} with a valid but non-existent
 *   UUID
 * - Expect the operation to fail (runtime error) and produce no side-effects
 *
 * Steps:
 *
 * 1. Register a new user (api.functional.auth.user.join)
 * 2. Assert registration result with typia.assert()
 * 3. Attempt to erase a non-existent todoId (typia.random UUID)
 * 4. Assert that the erase operation throws (await TestValidator.error)
 */
export async function test_api_todo_delete_not_found(
  connection: api.IConnection,
) {
  // 1) Register a fresh user to obtain authenticated session
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12); // satisfies MinLength<8>

  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        // Explicitly use null for optional nullable property per null-handling rules
        display_name: null,
      } satisfies ITodoAppUser.ICreate,
    });
  // Validate the authorization response
  typia.assert(authorized);

  // 2) Attempt to delete a non-existent todo
  const nonExistentTodoId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // The SDK will throw (HttpError) when resource not found; assert that an error occurs
  await TestValidator.error(
    "deleting non-existent todo should throw",
    async () => {
      await api.functional.todoApp.user.todos.erase(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
