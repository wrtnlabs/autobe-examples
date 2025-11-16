import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_retrieval_with_description(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.equals("user email matches", user.email, userEmail);

  // Step 2: Create a todo with a comprehensive description
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);
  TestValidator.equals(
    "created todo title matches",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "created todo description matches",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "created todo is not completed",
    createdTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "created todo belongs to user",
    createdTodo.todo_app_user_id,
    user.id,
  );

  // Step 3: Retrieve the todo by ID
  const retrievedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Verify the retrieved todo matches the created todo exactly
  TestValidator.equals(
    "retrieved todo id matches",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo title matches",
    retrievedTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "retrieved todo description is preserved",
    retrievedTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "retrieved todo description matches creation",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "retrieved todo is not completed",
    retrievedTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "retrieved todo user id matches",
    retrievedTodo.todo_app_user_id,
    user.id,
  );
  TestValidator.equals(
    "retrieved todo user email matches",
    retrievedTodo.user.email,
    user.email,
  );

  // Step 5: Validate description integrity
  TestValidator.predicate(
    "description is not truncated",
    retrievedTodo.description !== null &&
      retrievedTodo.description !== undefined &&
      retrievedTodo.description.length === todoDescription.length,
  );

  TestValidator.predicate(
    "description content is exactly preserved",
    retrievedTodo.description === todoDescription,
  );
}
