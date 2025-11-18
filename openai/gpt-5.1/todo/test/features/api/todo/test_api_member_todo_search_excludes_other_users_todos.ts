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

export async function test_api_member_todo_search_excludes_other_users_todos(
  connection: api.IConnection,
) {
  // 1. Register User A
  const userARequest = {
    email: `user_a_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://todo-app.example.com/signup",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const userA: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userARequest,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(userA);

  // 2. User A creates several todos with a shared keyword
  const sharedKeyword = "shared-keyword";

  const userATodoTitles: string[] = [
    `${sharedKeyword} task A1`,
    `${sharedKeyword} task A2`,
    `${sharedKeyword} task A3`,
  ];

  const userATodos: ITodoAppTodo[] = [];
  for (const title of userATodoTitles) {
    const todoCreateBody = {
      title,
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: todoCreateBody,
      });
    typia.assert<ITodoAppTodo>(todo);
    userATodos.push(todo);
  }

  // 3. Register User B (this will switch the connection authorization to User B)
  const userBRequest = {
    email: `user_b_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://todo-app.example.com/signup",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const userB: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userBRequest,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(userB);

  // 4. User B creates its own todos, including ones with the same shared keyword
  const userBKeywordTodos: ITodoAppTodo[] = [];
  const userBOtherTodos: ITodoAppTodo[] = [];

  const userBTodoTitlesWithKeyword: string[] = [
    `${sharedKeyword} task B1`,
    `${sharedKeyword} task B2`,
  ];
  const userBTodoTitlesWithoutKeyword: string[] = [
    "unique B task 1",
    "unique B task 2",
  ];

  for (const title of userBTodoTitlesWithKeyword) {
    const todoCreateBody = {
      title,
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: todoCreateBody,
      });
    typia.assert<ITodoAppTodo>(todo);
    userBKeywordTodos.push(todo);
  }

  for (const title of userBTodoTitlesWithoutKeyword) {
    const todoCreateBody = {
      title,
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: todoCreateBody,
      });
    typia.assert<ITodoAppTodo>(todo);
    userBOtherTodos.push(todo);
  }

  const totalUserBTodos = [...userBKeywordTodos, ...userBOtherTodos];

  // 5. As User B, perform a wide-open search using the shared keyword
  const searchRequestBody = {
    status: null,
    createdFrom: null,
    createdTo: null,
    completed: null,
    search: sharedKeyword,
    page: 1,
    limit: 20,
    orderBy: null,
    orderDirection: null,
  } satisfies ITodoAppTodo.IRequest;

  const searchResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: searchRequestBody,
    });
  typia.assert<IPageITodoAppTodo.ISummary>(searchResult);

  const { pagination, data } = searchResult;

  // 6. Assert that all returned todos belong to User B and none to User A
  TestValidator.equals(
    "records should equal data length",
    data.length,
    pagination.records,
  );

  for (const summary of data) {
    // every todo in the result must belong to User B
    TestValidator.equals(
      "each result todo belongs to User B",
      summary.memberUser.id,
      userB.id,
    );

    // ensure no todo from User A is present
    TestValidator.notEquals(
      "no result todo belongs to User A",
      summary.memberUser.id,
      userA.id,
    );
  }

  // 7. Verify that at least all of User B's keyword todos are present in results
  const userBKeywordTodoIds = new Set(userBKeywordTodos.map((todo) => todo.id));

  const resultIds = new Set(data.map((summary) => summary.id));

  for (const id of userBKeywordTodoIds) {
    TestValidator.predicate(
      "all User B keyword todos should appear in search results",
      resultIds.has(id),
    );
  }
}
