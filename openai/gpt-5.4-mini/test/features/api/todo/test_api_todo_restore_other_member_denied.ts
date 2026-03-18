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

import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_restore_other_member_denied(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const created = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  await api.functional.todoApp.member.todos.trash.index(memberAConnection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies ITodoAppTodo.IRequest,
  });
  await TestValidator.httpError(
    "restore by other member should be denied",
    [403, 404],
    async () => {
      await api.functional.todoApp.member.todos.trash.restore.patchByTodoid(
        memberBConnection,
        {
          todoId: created.id,
        },
      );
    },
  );
  const ownerTrash = await api.functional.todoApp.member.todos.trash.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(ownerTrash);
  TestValidator.predicate(
    "owner trash remains unaffected",
    !ownerTrash.data.some((todo) => todo.id === created.id),
  );
}
