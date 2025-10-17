import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_update_partial_success(
  connection: api.IConnection,
) {
  // 1. Register a new user (authentication). The SDK will set Authorization header.
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "Password123!",
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a new todo with description and position so we can verify they remain unchanged.
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const originalDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 6,
    sentenceMax: 10,
  });
  const originalPosition = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();

  const created: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
        position: originalPosition,
        // omit is_completed so server defaults to false per DTO documentation
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);

  // Basic sanity checks
  TestValidator.equals(
    "created todo title matches request",
    created.title,
    originalTitle,
  );
  TestValidator.equals(
    "created todo description matches request",
    created.description,
    originalDescription,
  );
  TestValidator.equals(
    "created todo position matches request",
    created.position,
    originalPosition,
  );
  TestValidator.predicate(
    "created todo is not completed by default",
    created.is_completed === false,
  );

  // Keep previous updated_at for comparison after update
  const previousUpdatedAt = created.updated_at;

  // 3. Prepare partial update: only title and is_completed toggled to true
  const newTitle = `Updated: ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 })}`;

  const updated: ITodoAppTodo = await api.functional.todoApp.user.todos.update(
    connection,
    {
      todoId: created.id,
      body: {
        title: newTitle,
        is_completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updated);

  // 4. Business assertions
  TestValidator.equals("title updated", updated.title, newTitle);
  TestValidator.equals(
    "is_completed updated to true",
    updated.is_completed,
    true,
  );

  // completed_at should be set when is_completed is true
  TestValidator.predicate(
    "completed_at is set when completed",
    updated.completed_at !== null && updated.completed_at !== undefined,
  );

  // Unspecified fields should remain unchanged
  TestValidator.equals(
    "description remains unchanged",
    updated.description,
    created.description,
  );
  TestValidator.equals(
    "position remains unchanged",
    updated.position,
    created.position,
  );

  // updated_at should be greater than or equal to previous updated_at
  TestValidator.predicate(
    "updated_at increased or equal",
    new Date(updated.updated_at).getTime() >=
      new Date(previousUpdatedAt).getTime(),
  );

  // Note: No DELETE operation available in provided SDK; test relies on test isolation.
}
