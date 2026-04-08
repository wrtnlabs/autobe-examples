import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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

export async function test_api_todo_trash_list_own_trashed_todos(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppMember.IJoin,
  });
  const created = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: created.id,
  });
  const trashedPage = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashedPage);
  TestValidator.equals(
    "trash list should contain exactly one trashed todo",
    trashedPage.data.length,
    1,
  );
  TestValidator.equals(
    "trash list pagination current page",
    trashedPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "trash list pagination limit",
    trashedPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "trash list pagination records",
    trashedPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "trash list pagination pages",
    trashedPage.pagination.pages,
    1,
  );
}
