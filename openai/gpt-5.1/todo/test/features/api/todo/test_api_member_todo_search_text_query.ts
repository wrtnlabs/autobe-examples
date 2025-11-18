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

export async function test_api_member_todo_search_text_query(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.example.com/signup",
    referrer: "https://todoapp.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(memberAuth);

  // 2. Create several todos with distinguishable titles/descriptions
  const todos: ITodoAppTodo[] = [];

  const todoMilk: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: "Buy milk at supermarket",
        description: "Remember to buy 2L of low-fat milk on the way home.",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert<ITodoAppTodo>(todoMilk);
  todos.push(todoMilk);

  const todoReport: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: "Write project report",
        description:
          "Draft the final project report for the Q4 release and send to manager.",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert<ITodoAppTodo>(todoReport);
  todos.push(todoReport);

  const todoReview: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: "Review code changes",
        description:
          "Review pull requests for the authentication module and add comments.",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert<ITodoAppTodo>(todoReview);
  todos.push(todoReview);

  const todoUnrelated: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: "Plan weekend trip",
        description: "Look up hiking trails and book accommodation.",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert<ITodoAppTodo>(todoUnrelated);
  todos.push(todoUnrelated);

  // Sanity check: ensure all todos belong to the same memberUser
  TestValidator.predicate(
    "all todos belong to joined member user",
    todos.every((todo) => todo.memberUser.id === memberAuth.id),
  );

  // Helper to perform a search and return result
  const searchTodos = async (
    search: string | null,
  ): Promise<IPageITodoAppTodo.ISummary> => {
    const body = {
      status: null,
      createdFrom: null,
      createdTo: null,
      completed: null,
      search,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
      orderBy: null,
      orderDirection: null,
    } satisfies ITodoAppTodo.IRequest;

    const page: IPageITodoAppTodo.ISummary =
      await api.functional.todoApp.memberUser.todos.index(connection, {
        body,
      });
    typia.assert<IPageITodoAppTodo.ISummary>(page);
    return page;
  };

  // 3. Search with keyword that should match only milk todo
  const milkKeyword = "milk";
  const milkPage = await searchTodos(milkKeyword);

  // Verify pagination metadata is consistent
  TestValidator.equals(
    "milk search: pagination.current is 1",
    milkPage.pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "milk search: limit is at least number of records",
    milkPage.pagination.limit >= milkPage.pagination.records,
  );

  // Verify that all returned todos contain the keyword in title or description
  TestValidator.predicate(
    "milk search: all results contain keyword in title or description",
    milkPage.data.every((summary) => {
      const haystack = `${summary.title}`.toLowerCase();
      return haystack.includes(milkKeyword.toLowerCase());
    }),
  );

  // Verify that the known "Buy milk" todo is included in the results
  TestValidator.predicate(
    "milk search: created milk todo is included in results",
    milkPage.data.some((summary) => summary.id === todoMilk.id),
  );

  // 4. Search with keyword that should match only project report todo
  const reportKeyword = "report";
  const reportPage = await searchTodos(reportKeyword);

  TestValidator.predicate(
    "report search: all results contain keyword in title or description",
    reportPage.data.every((summary) => {
      const haystack = `${summary.title}`.toLowerCase();
      return haystack.includes(reportKeyword.toLowerCase());
    }),
  );
  TestValidator.predicate(
    "report search: created report todo is included in results",
    reportPage.data.some((summary) => summary.id === todoReport.id),
  );

  // 5. Verify pagination.records equals data.length for both searches
  TestValidator.equals(
    "milk search: records equals data length",
    milkPage.pagination.records,
    milkPage.data.length,
  );
  TestValidator.equals(
    "report search: records equals data length",
    reportPage.pagination.records,
    reportPage.data.length,
  );

  // 6. Search with a term that matches no todos
  const noMatchKeyword = "this-keyword-should-not-match-any-todo";
  const emptyPage = await searchTodos(noMatchKeyword);

  TestValidator.equals(
    "no-match search: data is empty",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "no-match search: pagination.records is 0",
    emptyPage.pagination.records,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
}
