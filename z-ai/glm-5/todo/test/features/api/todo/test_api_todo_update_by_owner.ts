import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create initial todo
  const initialTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(initialTodo);
  // 3. Prepare update data with all fields changed
  const updatedTitle = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedStartDate = new Date(
    Date.now() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedDueDate = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 4. Update the todo
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        startDate: updatedStartDate,
        dueDate: updatedDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 5. Validate updated values
  TestValidator.equals("todo id unchanged", updatedTodo.id, initialTodo.id);
  TestValidator.equals("title updated", updatedTodo.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "start date updated",
    updatedTodo.startDate,
    updatedStartDate,
  );
  TestValidator.equals("due date updated", updatedTodo.dueDate, updatedDueDate);
  TestValidator.equals(
    "completion status unchanged",
    updatedTodo.completed,
    initialTodo.completed,
  );
  TestValidator.equals("not deleted", updatedTodo.deletedAt, null);
  TestValidator.predicate(
    "updated at is newer",
    new Date(updatedTodo.updatedAt).getTime() >
      new Date(initialTodo.updatedAt).getTime(),
  );
}
