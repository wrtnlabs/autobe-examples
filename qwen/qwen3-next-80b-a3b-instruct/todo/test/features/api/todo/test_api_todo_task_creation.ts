import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_todo_task_creation(connection: api.IConnection) {
  // Generate a random valid title within the 1-500 character constraint
  const title = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });

  // Create the task using the API
  const createdTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: title,
      } satisfies ITodoListTask.ICreate,
    },
  );

  // Validate the response type with typia.assert (COMPLETE validation)
  typia.assert(createdTask);

  // Only verify the business data: the title matches what was sent
  TestValidator.equals("task title matches input", createdTask.title, title);
}
