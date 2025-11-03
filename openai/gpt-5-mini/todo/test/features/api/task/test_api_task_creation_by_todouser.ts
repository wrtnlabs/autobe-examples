import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_task_creation_by_todouser(
  connection: api.IConnection,
) {
  // 1) Sign up a new todoUser (self-join) and obtain authorization token
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: userEmail,
    password: "Password123", // >= 8 chars
    href: "https://example.com/signup",
    referrer: "https://example.com/",
    displayName: RandomGenerator.name(),
  } satisfies ITodoAppTodoUser.ICreate;

  const auth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(auth);

  // 2) Create a new todo list owned by the joined user
  const listCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "private",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    {
      body: listCreateBody,
    },
  );
  typia.assert(list);

  // Helper for task creation
  const createTask = async (props: ITodoAppTask.ICreate) => {
    return await api.functional.todoApp.todoUser.lists.tasks.create(
      connection,
      {
        listId: list.id,
        body: props,
      },
    );
  };

  // 3) Create the primary task (happy path)
  const taskRequest = {
    title: "Buy groceries",
    description: "Milk, eggs",
    dueDate: "2025-11-15T12:00:00Z",
  } satisfies ITodoAppTask.ICreate;

  const task: ITodoAppTask = await createTask(taskRequest);
  typia.assert(task);

  // 4) Validate persisted fields and business rules
  TestValidator.equals("task title matches", task.title, taskRequest.title);
  TestValidator.equals(
    "task description matches",
    task.description,
    taskRequest.description,
  );
  TestValidator.equals(
    "task dueDate matches",
    task.dueDate,
    taskRequest.dueDate,
  );
  TestValidator.equals("task is linked to its list", task.list.id, list.id);

  // Business rule: isCompleted defaults to false
  TestValidator.equals(
    "isCompleted defaults to false",
    task.isCompleted,
    false,
  );

  // When not completed, completedAt should be null or undefined
  TestValidator.predicate(
    "completedAt is null or undefined when not completed",
    task.completedAt === null || task.completedAt === undefined,
  );

  // 5) Create a task with isCompleted=true and assert completedAt is set
  const completedTaskRequest = {
    title: "Already done",
    isCompleted: true,
  } satisfies ITodoAppTask.ICreate;

  const completedTask: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: list.id,
      body: completedTaskRequest,
    });
  typia.assert(completedTask);
  TestValidator.equals(
    "completed task isCompleted is true",
    completedTask.isCompleted,
    true,
  );
  TestValidator.predicate(
    "completedAt is present when isCompleted true",
    completedTask.completedAt !== null &&
      completedTask.completedAt !== undefined,
  );

  // 6) Negative cases
  // 6.a Unauthenticated request should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated cannot create task", async () => {
    await api.functional.todoApp.todoUser.lists.tasks.create(unauthConn, {
      listId: list.id,
      body: taskRequest,
    });
  });

  // 6.b Malformed listId should produce a validation/error response
  await TestValidator.error("malformed listId returns error", async () => {
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: "invalid-uuid",
      body: taskRequest,
    });
  });

  // 6.c Another authenticated user should NOT be able to create task on this list
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const otherJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123",
    href: "https://example.com/signup",
    referrer: "https://example.com/",
    displayName: RandomGenerator.name(),
  } satisfies ITodoAppTodoUser.ICreate;

  const otherAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(otherConn, { body: otherJoinBody });
  typia.assert(otherAuth);

  await TestValidator.error(
    "other user cannot create task on someone else's list",
    async () => {
      await api.functional.todoApp.todoUser.lists.tasks.create(otherConn, {
        listId: list.id,
        body: {
          title: "Not allowed",
          description: "Attempt to write to another's list",
        } satisfies ITodoAppTask.ICreate,
      });
    },
  );
}
