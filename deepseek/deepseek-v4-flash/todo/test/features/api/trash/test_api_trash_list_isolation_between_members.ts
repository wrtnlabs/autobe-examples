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

export async function test_api_trash_list_isolation_between_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and creates 3 todos, then soft-deletes them all
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  const memberATodos = await ArrayUtil.asyncRepeat(3, async () => {
    const todo = await generate_random_todo_app_member_todos_create(
      memberAConnection,
      {},
    );
    typia.assert(todo);
    return todo;
  });
  for (const todo of memberATodos) {
    await api.functional.todoApp.member.todos.eraseByTodoid(memberAConnection, {
      todoId: todo.id,
    });
  }
  // 2. Member B joins (different email)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456!",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member B's trash should be empty — no data leakage from Member A
  const memberBTrashEmpty = await api.functional.todoApp.member.trash.index(
    memberBConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBTrashEmpty);
  TestValidator.equals(
    "Member B trash is empty",
    memberBTrashEmpty.data.length,
    0,
  );
  // 4. Member B creates 2 todos and soft-deletes them
  const memberBTodos = await ArrayUtil.asyncRepeat(2, async () => {
    const todo = await generate_random_todo_app_member_todos_create(
      memberBConnection,
      {},
    );
    typia.assert(todo);
    return todo;
  });
  for (const todo of memberBTodos) {
    await api.functional.todoApp.member.todos.eraseByTodoid(memberBConnection, {
      todoId: todo.id,
    });
  }
  // 5. Member B's trash should have exactly 2 items
  const memberBTrash = await api.functional.todoApp.member.trash.index(
    memberBConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBTrash);
  TestValidator.equals(
    "Member B trash has 2 items",
    memberBTrash.data.length,
    2,
  );
  // 6. Member A's trash should still have exactly 3 items — no cross-contamination
  const memberATrash = await api.functional.todoApp.member.trash.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberATrash);
  TestValidator.equals(
    "Member A trash has 3 items",
    memberATrash.data.length,
    3,
  );
}
