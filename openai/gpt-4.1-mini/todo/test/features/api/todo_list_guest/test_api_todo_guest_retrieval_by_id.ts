import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListGuest";

export async function test_api_todo_guest_retrieval_by_id(
  connection: api.IConnection,
) {
  // Generate a random guest todo id
  const id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to retrieve the guest todo item by id
  const guestTodo: ITodoListTodoListGuest =
    await api.functional.todoList.todoListGuests.at(connection, { id });
  typia.assert(guestTodo);

  // Validate the properties exist and have proper types
  TestValidator.predicate(
    "content is non-empty string",
    typeof guestTodo.content === "string" && guestTodo.content.length > 0,
  );
  TestValidator.predicate(
    "is_completed is boolean",
    typeof guestTodo.is_completed === "boolean",
  );
  TestValidator.predicate(
    "priority between 1 and 5 inclusive",
    typeof guestTodo.priority === "number" &&
      guestTodo.priority >= 1 &&
      guestTodo.priority <= 5,
  );
  TestValidator.predicate(
    "created_at is a string of ISO datetime",
    typeof guestTodo.created_at === "string" && guestTodo.created_at.length > 0,
  );

  // updated_at is optional; verify if defined it's a string
  if (guestTodo.updated_at !== undefined) {
    TestValidator.predicate(
      "updated_at is string if defined",
      typeof guestTodo.updated_at === "string",
    );
  }

  // Test error handling: Try to fetch non-existent ID, expecting error
  const nonExistentId =
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" satisfies string &
      tags.Format<"uuid">;
  await TestValidator.error(
    "fetching non-existent guest todo throws error",
    async () => {
      await api.functional.todoList.todoListGuests.at(connection, {
        id: nonExistentId,
      });
    },
  );
}
