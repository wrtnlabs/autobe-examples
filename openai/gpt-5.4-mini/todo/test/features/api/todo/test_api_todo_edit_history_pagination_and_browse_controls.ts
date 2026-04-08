import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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

export async function test_api_todo_edit_history_pagination_and_browse_controls(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
    } satisfies ITodoAppMember.IJoin,
  });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        startDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
    },
  );
  typia.assert(todo);
  const page = await api.functional.todoApp.member.todos.editHistories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
        sort: "editedAt",
        order: "desc",
      } satisfies ITodoAppTodoEditHistory.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "requested page is returned",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit is returned",
    page.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "record count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "history entries belong to the requested todo",
    page.data.every((entry) => entry.todo.id === todo.id),
  );
}
