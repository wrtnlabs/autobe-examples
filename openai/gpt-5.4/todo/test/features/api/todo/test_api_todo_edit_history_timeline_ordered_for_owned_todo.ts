import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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

export async function test_api_todo_edit_history_timeline_ordered_for_owned_todo(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `todo-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
    },
  );
  typia.assert(todo);
  const request = {
    page: 1,
    limit: 10,
  } satisfies ITodoAppTodoEditHistory.IRequest;
  const firstPage =
    await api.functional.todoApp.member.todos.editHistories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: request,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current reflects explicit request",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit reflects explicit request",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination current and limit are positive",
    firstPage.pagination.current > 0 && firstPage.pagination.limit > 0,
  );
  TestValidator.equals(
    "never-edited owned todo returns empty history data",
    firstPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty history has zero records",
    firstPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero records yields zero pages",
    firstPage.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "records count is not smaller than returned data length",
    firstPage.pagination.records >= firstPage.data.length,
  );
  const secondPage =
    await api.functional.todoApp.member.todos.editHistories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "read-only retrieval does not create history rows",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "repeated retrieval keeps empty history length",
    secondPage.data.length,
    firstPage.data.length,
  );
  TestValidator.equals(
    "repeated retrieval keeps same pagination metadata",
    secondPage.pagination,
    firstPage.pagination,
  );
}
