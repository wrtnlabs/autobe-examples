import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_task_creation(connection: api.IConnection) {
  // Create a new todo list task with a valid title
  const title = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 50,
  });

  // Validate task creation with a title between 1-500 characters
  const createdTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: title,
      } satisfies ITodoListTask.ICreate,
    },
  );

  // Validate the response contains all required fields
  typia.assert(createdTask);

  // Check that the task title matches what was sent
  TestValidator.equals("task title matches input", createdTask.title, title);

  // Verify task is initially not completed
  TestValidator.equals(
    "task is initially not completed",
    createdTask.completed,
    false,
  );

  // Verify the todo_list_user_id property exists as a UUID
  TestValidator.predicate(
    "todo_list_user_id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdTask.todo_list_user_id,
    ),
  );

  // Verify x-autobe-prisma-schema property exists and has correct value
  TestValidator.equals(
    "x-autobe-prisma-schema property",
    createdTask["x-autobe-prisma-schema"],
    "todo_list_task",
  );
}
