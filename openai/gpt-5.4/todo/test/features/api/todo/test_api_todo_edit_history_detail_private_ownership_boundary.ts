import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_edit_history_detail_private_ownership_boundary(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  const ownedTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(ownedTodo);
  const missingHistoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "owned todo rejects unknown history detail lookup",
    async () => {
      await api.functional.todoApp.member.todos.editHistories.at(
        memberConnection,
        {
          todoId: ownedTodo.id,
          editHistoryId: missingHistoryId,
        },
      );
    },
  );
  const foreignOrUnknownTodoId = typia.random<string & tags.Format<"uuid">>();
  const foreignOrUnknownHistoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "private ownership boundary hides foreign or missing todo history detail",
    async () => {
      await api.functional.todoApp.member.todos.editHistories.at(
        memberConnection,
        {
          todoId: foreignOrUnknownTodoId,
          editHistoryId: foreignOrUnknownHistoryId,
        },
      );
    },
  );
}
