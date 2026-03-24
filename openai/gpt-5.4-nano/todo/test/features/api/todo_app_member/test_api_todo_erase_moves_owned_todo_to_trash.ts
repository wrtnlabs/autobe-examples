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

export async function test_api_todo_erase_moves_owned_todo_to_trash(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  const created: ITodoAppTodo =
    await generate_random_todo_app_member_todos_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(created);
  const indexBefore: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        completionStatusFilter: "all",
        sortBy: "created_at",
        sortDirection: "asc",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(indexBefore);
  const beforeNormal = indexBefore.data.find((x) => x.id === created.id);
  TestValidator.predicate(
    "todo exists before erase",
    () => beforeNormal !== undefined,
  );
  TestValidator.equals(
    "todo is not in trash before erase",
    beforeNormal?.deleted_in_trash_at ?? null,
    null,
  );
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: created.id,
  });
  const indexAfterFirst: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        completionStatusFilter: "all",
        sortBy: "created_at",
        sortDirection: "asc",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(indexAfterFirst);
  const afterFirstNormal = indexAfterFirst.data.find(
    (x) => x.id === created.id && x.deleted_in_trash_at === null,
  );
  TestValidator.predicate(
    "todo removed from normal list after first erase",
    () => afterFirstNormal === undefined,
  );
  const afterFirstTrash = indexAfterFirst.data.find(
    (x) => x.id === created.id && x.deleted_in_trash_at !== null,
  );
  TestValidator.predicate(
    "todo appears in trash after first erase",
    () => afterFirstTrash !== undefined,
  );
  // Idempotency: deleting again should keep it in trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: created.id,
  });
  const indexAfterSecond: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        completionStatusFilter: "all",
        sortBy: "created_at",
        sortDirection: "asc",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(indexAfterSecond);
  const afterSecondNormal = indexAfterSecond.data.find(
    (x) => x.id === created.id && x.deleted_in_trash_at === null,
  );
  TestValidator.predicate(
    "todo remains removed from normal list after second erase",
    () => afterSecondNormal === undefined,
  );
  const afterSecondTrash = indexAfterSecond.data.find(
    (x) => x.id === created.id && x.deleted_in_trash_at !== null,
  );
  TestValidator.predicate(
    "todo remains in trash after second erase",
    () => afterSecondTrash !== undefined,
  );
}
