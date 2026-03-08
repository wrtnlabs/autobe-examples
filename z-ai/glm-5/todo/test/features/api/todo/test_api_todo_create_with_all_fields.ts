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

export async function test_api_todo_create_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Prepare todo creation data with all fields
  const now = new Date();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const startDate = new Date(now.getTime() + oneDayInMs).toISOString();
  const dueDate = new Date(now.getTime() + 3 * oneDayInMs).toISOString();
  const body = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    startDate,
    dueDate,
  } satisfies ITodoAppTodo.ICreate;
  // 3. Create todo with all fields populated
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body },
  );
  typia.assert(todo);
  // 4. Verify all fields are correctly stored
  TestValidator.equals("title matches", todo.title, body.title);
  TestValidator.equals(
    "description matches",
    todo.description,
    body.description,
  );
  TestValidator.equals("startDate matches", todo.startDate, body.startDate);
  TestValidator.equals("dueDate matches", todo.dueDate, body.dueDate);
  TestValidator.equals("completed is false", todo.completed, false);
  TestValidator.equals("deletedAt is null", todo.deletedAt, null);
  // 5. Verify date ordering
  TestValidator.predicate(
    "startDate before dueDate",
    new Date(todo.startDate!).getTime() < new Date(todo.dueDate!).getTime(),
  );
}
