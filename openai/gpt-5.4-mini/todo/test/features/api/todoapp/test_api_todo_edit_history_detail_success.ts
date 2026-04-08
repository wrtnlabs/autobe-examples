import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_edit_history_detail_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  const todoConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  const created = await generate_random_todo_app_member_todos_create(
    todoConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(created);
  await TestValidator.error(
    "edit history detail requires an existing history entry",
    async () => {
      await api.functional.todoApp.member.todos.editHistories.at(
        todoConnection,
        {
          todoId: created.id,
          editHistoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
