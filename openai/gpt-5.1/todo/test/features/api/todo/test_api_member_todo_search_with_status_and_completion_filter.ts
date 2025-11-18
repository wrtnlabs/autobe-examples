import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_todo_search_with_status_and_completion_filter(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorized);

  const memberId = authorized.id;

  // 2. Seed multiple todos for this member
  const seedCount = 6;
  const createdTodos: ITodoAppTodo[] = await ArrayUtil.asyncRepeat(
    seedCount,
    async () => {
      const createBody = {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies ITodoAppTodo.ICreate;

      const todo = await api.functional.todoApp.memberUser.todos.create(
        connection,
        { body: createBody },
      );
      typia.assert(todo);

      TestValidator.equals(
        "created todo belongs to joined member user",
        todo.memberUser.id,
        memberId,
      );

      return todo;
    },
  );

  TestValidator.equals(
    "number of seeded todos",
    createdTodos.length,
    seedCount,
  );

  // Split into completed and pending targets
  const todosToComplete = createdTodos.slice(0, 3);
  const todosToKeepPending = createdTodos.slice(3);

  // 3. Complete a subset of todos
  const completedTodos: ITodoAppTodo[] = [];
  for (const todo of todosToComplete) {
    const completed = await api.functional.todoApp.memberUser.todos.complete(
      connection,
      { todoId: todo.id },
    );
    typia.assert(completed);

    TestValidator.equals(
      "completed todo id should match original",
      completed.id,
      todo.id,
    );

    TestValidator.predicate(
      "completed todo should have non-null completed_at",
      completed.completed_at !== null && completed.completed_at !== undefined,
    );

    completedTodos.push(completed);
  }

  const completedStatus = completedTodos[0]?.status ?? "completed";
  const pendingStatus = todosToKeepPending[0]?.status ?? "pending";

  // 4. Search completed todos only
  const completedSearchRequestBody = {
    status: completedStatus,
    createdFrom: null,
    createdTo: null,
    completed: true,
    search: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: null,
    orderDirection: null,
  } satisfies ITodoAppTodo.IRequest;

  const completedPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: completedSearchRequestBody,
    });
  typia.assert(completedPage);

  // 5. Validate that all results are completed todos of this member
  for (const summary of completedPage.data) {
    TestValidator.equals(
      "completed search result status must match completedStatus",
      summary.status,
      completedStatus,
    );

    TestValidator.predicate(
      "completed search result must have non-null completed_at",
      summary.completed_at !== null && summary.completed_at !== undefined,
    );

    TestValidator.equals(
      "completed search result must belong to authenticated member",
      summary.memberUser.id,
      memberId,
    );
  }

  const completedIds = new Set(completedTodos.map((t) => t.id));
  const pendingIds = new Set(todosToKeepPending.map((t) => t.id));

  for (const summary of completedPage.data) {
    TestValidator.predicate(
      "completed search must not contain pending ids",
      !pendingIds.has(summary.id),
    );
  }

  // 6. Search for pending (non-completed) todos
  const pendingSearchRequestBody = {
    status: pendingStatus,
    createdFrom: null,
    createdTo: null,
    completed: false,
    search: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: null,
    orderDirection: null,
  } satisfies ITodoAppTodo.IRequest;

  const pendingPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: pendingSearchRequestBody,
    });
  typia.assert(pendingPage);

  for (const summary of pendingPage.data) {
    TestValidator.equals(
      "pending search result status must match pendingStatus",
      summary.status,
      pendingStatus,
    );

    TestValidator.predicate(
      "pending search result must have null completed_at",
      summary.completed_at === null || summary.completed_at === undefined,
    );

    TestValidator.equals(
      "pending search result must belong to authenticated member",
      summary.memberUser.id,
      memberId,
    );

    TestValidator.predicate(
      "pending search must not contain completed ids",
      !completedIds.has(summary.id),
    );
  }
}
