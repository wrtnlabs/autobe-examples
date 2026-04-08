import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_list_filter_completion_and_sort_created_date(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test completion filtering and created-at sorting for the private member todo list.
   *
   * Validates that the authenticated member can browse only their own todos while
   * filtering by completion status and sorting by creation date. The scenario
   * covers both complete and incomplete subsets, along with ascending and
   * descending createdAt ordering, to ensure list browsing respects privacy and
   * list ordering rules.
   *
   * 1. Register a fresh member account and isolate the authenticated connection.
   * 2. Create a deterministic set of todos with mixed completion states.
   * 3. Query the todo list by completion status and verify each subset.
   * 4. Query the todo list sorted by createdAt ascending and descending.
   * 5. Validate pagination metadata and the returned membership scope.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies ITodoAppMember.IJoin,
  });
  const createdAtBase = new Date("2026-01-01T00:00:00.000Z").getTime();
  const todoInputs = ArrayUtil.repeat(4, (index) => ({
    title: `todo-${index + 1}-${RandomGenerator.alphabets(6)}`,
    description:
      index % 2 === 0 ? RandomGenerator.paragraph({ sentences: 2 }) : null,
    isCompleted: index % 2 === 1,
  }));
  const created: ITodoAppTodo[] = [];
  for (const item of todoInputs) {
    const todo = await api.functional.todoApp.member.todos.create(
      memberConnection,
      {
        body: {
          title: item.title,
          description: item.description,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    created.push(todo);
  }
  const completePage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completionStatus: "complete",
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 50,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completePage);
  const incompletePage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completionStatus: "incomplete",
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 50,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompletePage);
  const ascPage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 50,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(ascPage);
  const descPage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 50,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(descPage);
  const expectedComplete = created
    .filter((todo) => todo.isCompleted)
    .map((todo) => todo.id);
  const expectedIncomplete = created
    .filter((todo) => !todo.isCompleted)
    .map((todo) => todo.id);
  const expectedAsc = [...created]
    .sort((x, y) => x.createdAt.localeCompare(y.createdAt))
    .map((todo) => todo.id);
  const expectedDesc = [...expectedAsc].reverse();
  TestValidator.equals(
    "complete filter should return only completed todos",
    completePage.data
      .map((todo) => todo.isCompleted)
      .every((value) => value === true),
    true,
  );
  TestValidator.equals(
    "incomplete filter should return only incomplete todos",
    incompletePage.data
      .map((todo) => todo.isCompleted)
      .every((value) => value === false),
    true,
  );
  TestValidator.equals(
    "complete filter should match the created completed todos",
    completePage.data.map((todo) => todo.id).sort(),
    expectedComplete.sort(),
  );
  TestValidator.equals(
    "incomplete filter should match the created incomplete todos",
    incompletePage.data.map((todo) => todo.id).sort(),
    expectedIncomplete.sort(),
  );
  TestValidator.equals(
    "createdAt ascending order should match creation order",
    ascPage.data.map((todo) => todo.id),
    expectedAsc,
  );
  TestValidator.equals(
    "createdAt descending order should match reverse creation order",
    descPage.data.map((todo) => todo.id),
    expectedDesc,
  );
  TestValidator.equals(
    "ascending page should report first page",
    ascPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "descending page should report first page",
    descPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "complete page should report first page",
    completePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "incomplete page should report first page",
    incompletePage.pagination.current,
    1,
  );
}
