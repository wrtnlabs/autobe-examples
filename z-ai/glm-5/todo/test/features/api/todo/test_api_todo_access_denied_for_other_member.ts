import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

export async function test_api_todo_access_denied_for_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A who will own the todo
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a todo owned by member A
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // 3. Register member B who will attempt to access member A's todo
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Verify member B is different from member A
  TestValidator.notEquals("members have different IDs", memberA.id, memberB.id);
  // 4. Attempt to access member A's todo using member B's authorization
  // Should return 404 Not Found (privacy-preserving - doesn't reveal todo existence)
  await TestValidator.httpError(
    "member B cannot access member A's todo",
    404,
    async () => {
      await api.functional.privateTodoApp.member.todos.at(memberBConnection, {
        todoId: todo.id,
      });
    },
  );
}
