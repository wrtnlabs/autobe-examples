import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test the todo list sorting functionality with proper NULL date handling.
 * After member authentication, create multiple todos with various start dates and due dates - some with dates set and some with NULL values.
 * Test sorting scenarios:
 * (1) Sort by createdAt in ascending and descending order - verify todos are ordered correctly by creation timestamp.
 * (2) Sort by startedAt with ascending direction - verify todos with start dates appear first in chronological order, and todos without start dates appear at the end.
 * (3) Sort by startedAt with descending direction - verify todos with start dates appear first in reverse chronological order, and todos without start dates still appear at the end.
 * (4) Repeat similar tests for dueAt sorting.
 * Validate that NULL values consistently position at the end regardless of sort direction, as specified in the business requirements.
 */
export async function test_api_todo_list_sorting_with_null_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create todos with various date configurations
  // Todo 1: All dates set (started_at and due_at)
  const todo1 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        started_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 86400000).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // Wait a bit to ensure different createdAt timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Todo 2: Only started_at (null due_at)
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        started_at: new Date(Date.now() + 86400000 * 2).toISOString(),
        due_at: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Todo 3: Only due_at (null started_at)
  const todo3 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        started_at: null,
        due_at: new Date(Date.now() + 86400000 * 3).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo3);
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Todo 4: Both dates null
  const todo4 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        started_at: null,
        due_at: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo4);
  // 3. Test sorting by createdAt (ascending)
  const createdAtAsc = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "createdAt",
        sortDirection: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(createdAtAsc);
  TestValidator.predicate(
    "createdAt asc - first todo created earliest",
    new Date(createdAtAsc.data[0].createdAt).getTime() <=
      new Date(createdAtAsc.data[1].createdAt).getTime(),
  );
  TestValidator.predicate(
    "createdAt asc - last todo created latest",
    new Date(createdAtAsc.data[3].createdAt).getTime() >=
      new Date(createdAtAsc.data[2].createdAt).getTime(),
  );
  // 4. Test sorting by createdAt (descending)
  const createdAtDesc = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "createdAt",
        sortDirection: "desc",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(createdAtDesc);
  TestValidator.predicate(
    "createdAt desc - first todo created latest",
    new Date(createdAtDesc.data[0].createdAt).getTime() >=
      new Date(createdAtDesc.data[1].createdAt).getTime(),
  );
  // 5. Test sorting by startedAt (ascending) - nulls at end
  const startedAtAsc = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "startedAt",
        sortDirection: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(startedAtAsc);
  // Todos with started_at should appear before todos without started_at
  const todosWithStartedAt = startedAtAsc.data.filter(
    (t) => t.startedAt !== null && t.startedAt !== undefined,
  );
  const todosWithoutStartedAt = startedAtAsc.data.filter(
    (t) => t.startedAt === null || t.startedAt === undefined,
  );
  TestValidator.predicate(
    "startedAt asc - todos with dates appear before nulls",
    startedAtAsc.data.indexOf(todosWithStartedAt[0]) <
      startedAtAsc.data.indexOf(todosWithoutStartedAt[0]),
  );
  // 6. Test sorting by startedAt (descending) - nulls still at end
  const startedAtDesc = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "startedAt",
        sortDirection: "desc",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(startedAtDesc);
  // Nulls should still appear at end even in descending order
  const descTodosWithStartedAt = startedAtDesc.data.filter(
    (t) => t.startedAt !== null && t.startedAt !== undefined,
  );
  const descTodosWithoutStartedAt = startedAtDesc.data.filter(
    (t) => t.startedAt === null || t.startedAt === undefined,
  );
  TestValidator.predicate(
    "startedAt desc - nulls still at end",
    startedAtDesc.data.indexOf(descTodosWithStartedAt[0]) <
      startedAtDesc.data.indexOf(descTodosWithoutStartedAt[0]),
  );
  // 7. Test sorting by dueAt (ascending) - nulls at end
  const dueAtAsc = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "dueAt",
        sortDirection: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(dueAtAsc);
  const todosWithDueAt = dueAtAsc.data.filter(
    (t) => t.dueAt !== null && t.dueAt !== undefined,
  );
  const todosWithoutDueAt = dueAtAsc.data.filter(
    (t) => t.dueAt === null || t.dueAt === undefined,
  );
  TestValidator.predicate(
    "dueAt asc - todos with dates appear before nulls",
    dueAtAsc.data.indexOf(todosWithDueAt[0]) <
      dueAtAsc.data.indexOf(todosWithoutDueAt[0]),
  );
  // 8. Test sorting by dueAt (descending) - nulls still at end
  const dueAtDesc = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "dueAt",
        sortDirection: "desc",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(dueAtDesc);
  const descTodosWithDueAt = dueAtDesc.data.filter(
    (t) => t.dueAt !== null && t.dueAt !== undefined,
  );
  const descTodosWithoutDueAt = dueAtDesc.data.filter(
    (t) => t.dueAt === null || t.dueAt === undefined,
  );
  TestValidator.predicate(
    "dueAt desc - nulls still at end",
    dueAtDesc.data.indexOf(descTodosWithDueAt[0]) <
      dueAtDesc.data.indexOf(descTodosWithoutDueAt[0]),
  );
}
