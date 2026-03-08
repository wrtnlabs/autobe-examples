import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

/**
 * Test privacy and data isolation between users in todo list functionality.
 *
 * This test validates that:
 * 1. Member A's todos are completely invisible to Member B
 * 2. Member B can only see their own todos (empty list if they haven't created any)
 * 3. Privacy is enforced across all filter and sort combinations
 * 4. The todo_app_member_id foreign key constraint properly isolates data
 */
export async function test_api_todo_list_privacy_isolation_between_users(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create Member B account
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Create multiple todos for Member A with various properties
  const todoATitle1 = RandomGenerator.paragraph({ sentences: 2 });
  const todoA1 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: todoATitle1,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date(Date.now() + 86400000).toISOString(),
        dueDate: new Date(Date.now() + 172800000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA1);
  const todoATitle2 = RandomGenerator.paragraph({ sentences: 1 });
  const todoA2 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: todoATitle2,
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA2);
  const todoATitle3 = RandomGenerator.paragraph({ sentences: 4 });
  const todoA3 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: todoATitle3,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: null,
        dueDate: new Date(Date.now() + 259200000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA3);
  // 4. Verify Member B sees empty todo list (no todos of their own)
  const memberBTodos = await api.functional.todoApp.member.todos.index(
    memberBConnection,
    {
      body: {
        search: undefined,
        completed: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBTodos);
  TestValidator.equals(
    "Member B should see empty todo list",
    memberBTodos.data.length,
    0,
  );
  TestValidator.equals(
    "Member B pagination records should be 0",
    memberBTodos.pagination.records,
    0,
  );
  // 5. Test with various filter combinations - Member B should still see empty results
  const memberBTodosWithSearch =
    await api.functional.todoApp.member.todos.index(memberBConnection, {
      body: {
        search: todoATitle1.substring(0, 5),
        completed: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(memberBTodosWithSearch);
  TestValidator.equals(
    "Member B should not see Member A's todos with search",
    memberBTodosWithSearch.data.length,
    0,
  );
  const memberBTodosWithFilter =
    await api.functional.todoApp.member.todos.index(memberBConnection, {
      body: {
        search: undefined,
        completed: "incomplete",
        sortBy: "dueDate",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(memberBTodosWithFilter);
  TestValidator.equals(
    "Member B should not see Member A's todos with filter",
    memberBTodosWithFilter.data.length,
    0,
  );
  // 6. Create a todo for Member B
  const todoBTitle = RandomGenerator.paragraph({ sentences: 2 });
  const todoB1 = await generate_random_todo_app_member_todos_create(
    memberBConnection,
    {
      body: {
        title: todoBTitle,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB1);
  // 7. Verify Member B now sees only their own todo (1 todo)
  const memberBTodosAfterCreation =
    await api.functional.todoApp.member.todos.index(memberBConnection, {
      body: {
        search: undefined,
        completed: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(memberBTodosAfterCreation);
  TestValidator.equals(
    "Member B should see exactly 1 todo after creating one",
    memberBTodosAfterCreation.data.length,
    1,
  );
  TestValidator.equals(
    "Member B should see their own todo",
    memberBTodosAfterCreation.data[0].id,
    todoB1.id,
  );
  TestValidator.predicate(
    "Member B should not see any of Member A's todos",
    memberBTodosAfterCreation.data.every(
      (todo) =>
        todo.id !== todoA1.id && todo.id !== todoA2.id && todo.id !== todoA3.id,
    ),
  );
  // 8. Verify Member A still sees all their todos (3 todos)
  const memberATodos = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        search: undefined,
        completed: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberATodos);
  TestValidator.equals(
    "Member A should see all 3 of their todos",
    memberATodos.data.length,
    3,
  );
  TestValidator.predicate(
    "Member A should see their own todos",
    memberATodos.data.some((todo) => todo.id === todoA1.id) &&
      memberATodos.data.some((todo) => todo.id === todoA2.id) &&
      memberATodos.data.some((todo) => todo.id === todoA3.id),
  );
  TestValidator.predicate(
    "Member A should not see Member B's todo",
    memberATodos.data.every((todo) => todo.id !== todoB1.id),
  );
  // 9. Test sorting variations - Member B should still only see their own todo
  const memberBSortedByStartDate =
    await api.functional.todoApp.member.todos.index(memberBConnection, {
      body: {
        search: undefined,
        completed: "all",
        sortBy: "startDate",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(memberBSortedByStartDate);
  TestValidator.equals(
    "Member B should still see only 1 todo with startDate sort",
    memberBSortedByStartDate.data.length,
    1,
  );
  const memberBSortedByDueDate =
    await api.functional.todoApp.member.todos.index(memberBConnection, {
      body: {
        search: undefined,
        completed: "all",
        sortBy: "dueDate",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(memberBSortedByDueDate);
  TestValidator.equals(
    "Member B should still see only 1 todo with dueDate sort",
    memberBSortedByDueDate.data.length,
    1,
  );
  // 10. Test pagination - Member B should not see Member A's todos even with pagination
  const memberBPaginated = await api.functional.todoApp.member.todos.index(
    memberBConnection,
    {
      body: {
        search: undefined,
        completed: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBPaginated);
  TestValidator.equals(
    "Member B should see only 1 todo even with large limit",
    memberBPaginated.data.length,
    1,
  );
  TestValidator.equals(
    "Member B pagination records should be 1",
    memberBPaginated.pagination.records,
    1,
  );
}
