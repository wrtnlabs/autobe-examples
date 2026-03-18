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

export async function test_api_todo_trash_list_member_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  const emptyPage = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "all",
        sort: "createdAtDesc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "trash page metadata should be non-negative",
    emptyPage.pagination.current >= 0 &&
      emptyPage.pagination.limit >= 0 &&
      emptyPage.pagination.records >= 0 &&
      emptyPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "empty trash should return a successful empty or scoped page",
    emptyPage.data.length === 0 ||
      emptyPage.data.every((todo) => todo.member.id === member.id),
  );
  TestValidator.predicate(
    "trash list should only contain trashed todos",
    emptyPage.data.every((todo) => todo.deleted_at !== null),
  );
  TestValidator.predicate(
    "trash list should only contain the authenticated member's todos",
    emptyPage.data.every((todo) => todo.member.id === member.id),
  );
  const filteredPage = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 5,
        completionStatus: "complete",
        sort: "createdAtAsc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered trash page should not exceed the requested limit",
    filteredPage.data.length <= 5,
  );
  TestValidator.predicate(
    "filtered trash page should only contain trashed todos",
    filteredPage.data.every((todo) => todo.deleted_at !== null),
  );
  TestValidator.predicate(
    "filtered trash page should only contain the authenticated member's todos",
    filteredPage.data.every((todo) => todo.member.id === member.id),
  );
}
