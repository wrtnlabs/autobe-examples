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

export async function test_api_todo_cross_user_update_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A authenticates and creates a todo
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const memberATodo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(memberATodo);
  const originalTitle = memberATodo.title;
  const originalDescription = memberATodo.description;
  const originalStartDate = memberATodo.start_date;
  const originalDueDate = memberATodo.due_date;
  // 2. Member B authenticates as a different member
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member B attempts to update Member A's todo — expect not-found
  await TestValidator.error("cross-user update denied", async () => {
    await api.functional.todoApp.member.todos.update(memberBConnection, {
      todoId: memberATodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.IUpdate,
    });
  });
  // 4. Verify Member A's todo remains unchanged after the failed attempt
  TestValidator.equals("title unchanged", memberATodo.title, originalTitle);
  TestValidator.equals(
    "description unchanged",
    memberATodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "start date unchanged",
    memberATodo.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "due date unchanged",
    memberATodo.due_date,
    originalDueDate,
  );
}
