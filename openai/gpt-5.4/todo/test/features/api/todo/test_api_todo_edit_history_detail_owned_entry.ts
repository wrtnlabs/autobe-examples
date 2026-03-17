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

export async function test_api_todo_edit_history_detail_owned_entry(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        startDate: new Date(Date.now() + 60000).toISOString(),
        dueDate: new Date(Date.now() + 120000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updated = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: created.id,
      body: {
        title: updatedTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "todo id preserved after update",
    updated.id,
    created.id,
  );
  TestValidator.equals("title updated", updated.title, updatedTitle);
  TestValidator.equals(
    "description remains unchanged after title-only update",
    updated.description,
    created.description,
  );
  TestValidator.equals(
    "start_date remains unchanged after title-only update",
    updated.start_date,
    created.start_date,
  );
  TestValidator.equals(
    "due_date remains unchanged after title-only update",
    updated.due_date,
    created.due_date,
  );
  await TestValidator.error("unknown edit history id is rejected", async () => {
    await api.functional.todoApp.member.todos.editHistories.at(
      memberConnection,
      {
        todoId: created.id,
        editHistoryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
