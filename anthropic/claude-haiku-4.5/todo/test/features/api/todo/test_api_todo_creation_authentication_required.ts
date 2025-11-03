import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_creation_authentication_required(
  connection: api.IConnection,
) {
  // Step 1: Test unauthenticated request fails (using fresh connection without any auth)
  const unauthConnection: api.IConnection = connection;

  await TestValidator.error(
    "todo creation should fail without authentication",
    async () => {
      await api.functional.todoApp.user.todos.create(unauthConnection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.ICreate,
      });
    },
  );

  // Step 2: Create authenticated user to obtain valid token
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const authenticatedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(authenticatedUser);

  const validToken = authenticatedUser.token.access;
  TestValidator.predicate(
    "authenticated user token exists and has content",
    validToken.length > 0,
  );

  // Step 3: Test with valid token - should succeed
  // After join() call, connection.headers.Authorization is automatically set by the SDK
  const todoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  TestValidator.predicate(
    "created todo has valid id",
    createdTodo.id.length > 0,
  );
  TestValidator.equals(
    "created todo status is active",
    createdTodo.status,
    "active",
  );
  TestValidator.predicate(
    "created todo belongs to authenticated user",
    createdTodo.todo_app_user_id === authenticatedUser.id,
  );
  TestValidator.equals(
    "created todo title matches input",
    createdTodo.title,
    todoTitle,
  );
}
