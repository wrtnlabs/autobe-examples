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

export async function test_api_member_todos_filter_and_sort_completion(
  connection: api.IConnection,
): Promise<void> {
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies ITodoAppMember.IJoin,
  });
  const member1Todos: ITodoAppTodo[] = [];
  const titles1 = ArrayUtil.repeat(3, () => RandomGenerator.name());
  for (const title of titles1) {
    const todo = await generate_random_todo_app_member_todos_create(
      member1Connection,
      {
        body: {
          title,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    member1Todos.push(todo);
  }
  // Attempt to mark one todo as completed via the only available member update operation.
  // Note: ITodoAppTodo.IUpdate does not include completion_status, so completion may not change.
  await api.functional.todoApp.member.todos.update(member1Connection, {
    todoId: member1Todos[0].id,
    body: {
      title: member1Todos[0].title,
      description: member1Todos[0].description,
      start_date: member1Todos[0].start_date,
      due_date: member1Todos[0].due_date,
    } satisfies ITodoAppTodo.IUpdate,
  });
  const requestBase = {
    sortBy: "created_at" as const,
    sortDirection: "desc" as const,
    page: 1 as const,
    limit: 10 as const,
  } satisfies Omit<ITodoAppTodo.IRequest, "completionStatusFilter">;
  const incompletePage = await api.functional.todoApp.member.todos.index(
    member1Connection,
    {
      body: {
        ...requestBase,
        completionStatusFilter: "incomplete",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompletePage);
  TestValidator.predicate(
    "incomplete response has non-empty data",
    () => incompletePage.data.length > 0,
  );
  for (const item of incompletePage.data) {
    TestValidator.equals(
      "incomplete completion_status is false",
      item.completion_status,
      false,
    );
  }
  const incompleteSorted = [...incompletePage.data].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  TestValidator.equals(
    "incomplete created_at sorted desc",
    incompletePage.data.map((x) => x.id),
    incompleteSorted.map((x) => x.id),
  );
  const completePageBeforePrivacy =
    await api.functional.todoApp.member.todos.index(member1Connection, {
      body: {
        ...requestBase,
        completionStatusFilter: "complete",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(completePageBeforePrivacy);
  if (completePageBeforePrivacy.data.length > 0) {
    for (const item of completePageBeforePrivacy.data) {
      TestValidator.equals(
        "complete completion_status is true",
        item.completion_status,
        true,
      );
    }
    const completeSortedBefore = [...completePageBeforePrivacy.data].sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    );
    TestValidator.equals(
      "complete created_at sorted desc",
      completePageBeforePrivacy.data.map((x) => x.id),
      completeSortedBefore.map((x) => x.id),
    );
  }
  // Privacy validation: create member2 todos after member1 queries,
  // then re-fetch member1 lists and ensure no member2 ids appear.
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies ITodoAppMember.IJoin,
  });
  const member2Todos: ITodoAppTodo[] = [];
  const titles2 = ArrayUtil.repeat(3, () => RandomGenerator.name());
  for (const title of titles2) {
    const todo = await generate_random_todo_app_member_todos_create(
      member2Connection,
      {
        body: {
          title,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    member2Todos.push(todo);
  }
  await api.functional.todoApp.member.todos.update(member2Connection, {
    todoId: member2Todos[0].id,
    body: {
      title: member2Todos[0].title,
      description: member2Todos[0].description,
      start_date: member2Todos[0].start_date,
      due_date: member2Todos[0].due_date,
    } satisfies ITodoAppTodo.IUpdate,
  });
  const incompletePageAfterPrivacy =
    await api.functional.todoApp.member.todos.index(member1Connection, {
      body: {
        ...requestBase,
        completionStatusFilter: "incomplete",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(incompletePageAfterPrivacy);
  const completePageAfterPrivacy =
    await api.functional.todoApp.member.todos.index(member1Connection, {
      body: {
        ...requestBase,
        completionStatusFilter: "complete",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(completePageAfterPrivacy);
  const member2TodoIds = new Set(member2Todos.map((x) => x.id));
  for (const item of incompletePageAfterPrivacy.data) {
    TestValidator.predicate(
      "privacy: member2 todo id not in member1 incomplete list",
      () => !member2TodoIds.has(item.id),
    );
  }
  for (const item of completePageAfterPrivacy.data) {
    TestValidator.predicate(
      "privacy: member2 todo id not in member1 complete list",
      () => !member2TodoIds.has(item.id),
    );
  }
}
