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
 * Test todo list sorting behavior when todos have null started_at or due_at values.
 * Verifies that todos without dates appear at the end of sorted lists regardless
 * of sort direction (asc/desc), as per the business rule.
 */
export async function test_api_todo_list_sort_with_null_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple todos with various date configurations
  // Todo 1: Has both started_at and due_at
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        started_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // Wait to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Todo 2: Has started_at but null due_at
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        started_at: new Date(Date.now() + 86400000 * 2).toISOString(),
        due_at: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Todo 3: Has due_at but null started_at
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        started_at: null,
        due_at: new Date(Date.now() + 86400000 * 14).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Todo 4: Both started_at and due_at are null
  const todo4 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        started_at: null,
        due_at: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo4);
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Todo 5: Has both dates with earlier values
  const todo5 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        started_at: new Date(Date.now() - 86400000).toISOString(),
        due_at: new Date(Date.now() + 86400000 * 3).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo5);
  // 3. Test sorting by started_at with order='asc'
  const sortedByStartedAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "started_at",
        order: "asc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByStartedAsc);
  // Verify todos with null started_at appear at the end
  const nullStartedAtIndices: number[] = [];
  const nonNullStartedAtIndices: number[] = [];
  sortedByStartedAsc.data.forEach((todo, index) => {
    if (todo.started_at === null) {
      nullStartedAtIndices.push(index);
    } else {
      nonNullStartedAtIndices.push(index);
    }
  });
  // All null started_at should be at the end
  TestValidator.predicate("null started_at todos appear at end (asc)", () => {
    if (nullStartedAtIndices.length === 0) return true;
    const maxNonNullIndex = Math.max(...nonNullStartedAtIndices);
    const minNullIndex = Math.min(...nullStartedAtIndices);
    return minNullIndex > maxNonNullIndex;
  });
  // Verify non-null started_at are in ascending order
  const nonNullStartedTodos = sortedByStartedAsc.data.filter(
    (
      t,
    ): t is typeof t & {
      started_at: string;
    } => t.started_at !== null,
  );
  for (let i = 1; i < nonNullStartedTodos.length; i++) {
    const prevDate = new Date(nonNullStartedTodos[i - 1].started_at).getTime();
    const currDate = new Date(nonNullStartedTodos[i].started_at).getTime();
    TestValidator.predicate(
      `started_at ascending order (item ${i})`,
      prevDate <= currDate,
    );
  }
  // 4. Test sorting by started_at with order='desc'
  const sortedByStartedDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "started_at",
        order: "desc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByStartedDesc);
  // Verify todos with null started_at still appear at the end
  const nullStartedAtIndicesDesc: number[] = [];
  const nonNullStartedAtIndicesDesc: number[] = [];
  sortedByStartedDesc.data.forEach((todo, index) => {
    if (todo.started_at === null) {
      nullStartedAtIndicesDesc.push(index);
    } else {
      nonNullStartedAtIndicesDesc.push(index);
    }
  });
  TestValidator.predicate("null started_at todos appear at end (desc)", () => {
    if (nullStartedAtIndicesDesc.length === 0) return true;
    const maxNonNullIndex = Math.max(...nonNullStartedAtIndicesDesc);
    const minNullIndex = Math.min(...nullStartedAtIndicesDesc);
    return minNullIndex > maxNonNullIndex;
  });
  // Verify non-null started_at are in descending order
  const nonNullStartedTodosDesc = sortedByStartedDesc.data.filter(
    (
      t,
    ): t is typeof t & {
      started_at: string;
    } => t.started_at !== null,
  );
  for (let i = 1; i < nonNullStartedTodosDesc.length; i++) {
    const prevDate = new Date(
      nonNullStartedTodosDesc[i - 1].started_at,
    ).getTime();
    const currDate = new Date(nonNullStartedTodosDesc[i].started_at).getTime();
    TestValidator.predicate(
      `started_at descending order (item ${i})`,
      prevDate >= currDate,
    );
  }
  // 5. Test sorting by due_at with order='asc'
  const sortedByDueAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "due_at",
        order: "asc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByDueAsc);
  const nullDueAtIndices: number[] = [];
  const nonNullDueAtIndices: number[] = [];
  sortedByDueAsc.data.forEach((todo, index) => {
    if (todo.due_at === null) {
      nullDueAtIndices.push(index);
    } else {
      nonNullDueAtIndices.push(index);
    }
  });
  TestValidator.predicate("null due_at todos appear at end (asc)", () => {
    if (nullDueAtIndices.length === 0) return true;
    const maxNonNullIndex = Math.max(...nonNullDueAtIndices);
    const minNullIndex = Math.min(...nullDueAtIndices);
    return minNullIndex > maxNonNullIndex;
  });
  // Verify non-null due_at are in ascending order
  const nonNullDueTodos = sortedByDueAsc.data.filter(
    (
      t,
    ): t is typeof t & {
      due_at: string;
    } => t.due_at !== null,
  );
  for (let i = 1; i < nonNullDueTodos.length; i++) {
    const prevDate = new Date(nonNullDueTodos[i - 1].due_at).getTime();
    const currDate = new Date(nonNullDueTodos[i].due_at).getTime();
    TestValidator.predicate(
      `due_at ascending order (item ${i})`,
      prevDate <= currDate,
    );
  }
  // 6. Test sorting by due_at with order='desc'
  const sortedByDueDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "due_at",
        order: "desc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByDueDesc);
  const nullDueAtIndicesDesc: number[] = [];
  const nonNullDueAtIndicesDesc: number[] = [];
  sortedByDueDesc.data.forEach((todo, index) => {
    if (todo.due_at === null) {
      nullDueAtIndicesDesc.push(index);
    } else {
      nonNullDueAtIndicesDesc.push(index);
    }
  });
  TestValidator.predicate("null due_at todos appear at end (desc)", () => {
    if (nullDueAtIndicesDesc.length === 0) return true;
    const maxNonNullIndex = Math.max(...nonNullDueAtIndicesDesc);
    const minNullIndex = Math.min(...nullDueAtIndicesDesc);
    return minNullIndex > maxNonNullIndex;
  });
  // Verify non-null due_at are in descending order
  const nonNullDueTodosDesc = sortedByDueDesc.data.filter(
    (
      t,
    ): t is typeof t & {
      due_at: string;
    } => t.due_at !== null,
  );
  for (let i = 1; i < nonNullDueTodosDesc.length; i++) {
    const prevDate = new Date(nonNullDueTodosDesc[i - 1].due_at).getTime();
    const currDate = new Date(nonNullDueTodosDesc[i].due_at).getTime();
    TestValidator.predicate(
      `due_at descending order (item ${i})`,
      prevDate >= currDate,
    );
  }
  // 7. Test sorting by created_at (no null handling needed)
  const sortedByCreated = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "created_at",
        order: "asc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByCreated);
  // Verify created_at is in ascending order
  for (let i = 1; i < sortedByCreated.data.length; i++) {
    const prevDate = new Date(sortedByCreated.data[i - 1].created_at).getTime();
    const currDate = new Date(sortedByCreated.data[i].created_at).getTime();
    TestValidator.predicate(
      `created_at ascending order (item ${i})`,
      prevDate <= currDate,
    );
  }
}
