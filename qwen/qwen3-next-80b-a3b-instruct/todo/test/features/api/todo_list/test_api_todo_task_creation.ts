import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_todo_task_creation(connection: api.IConnection) {
  const taskTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  const createdTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: taskTitle,
      } satisfies ITodoListTask.ICreate,
    },
  );

  typia.assert(createdTask);

  TestValidator.equals(
    "created task title matches input",
    createdTask.title,
    taskTitle,
  );
  TestValidator.equals(
    "created task completed status is false",
    createdTask.completed,
    false,
  );
}
