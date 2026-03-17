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

export async function test_api_todo_privacy_member_association(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Create a todo as Member A with specific title
  const todoA = await generate_random_private_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: "Member A Private Todo",
      },
    },
  );
  typia.assert(todoA);
  // 3. Verify the todo's member.id matches Member A's id
  TestValidator.equals(
    "todo should belong to Member A",
    todoA.member.id,
    memberA.id,
  );
  // 4. Verify the todo's member.displayName matches Member A's displayName
  TestValidator.equals(
    "todo member displayName matches",
    todoA.member.displayName,
    memberA.displayName,
  );
  // 5. Authenticate as a different Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 6. Create a todo as Member B to verify independent association
  const todoB = await generate_random_private_todo_app_member_todos_create(
    memberBConnection,
    {
      body: {
        title: "Member B Private Todo",
      },
    },
  );
  typia.assert(todoB);
  // 7. Verify the todo is correctly associated with Member B, not Member A
  TestValidator.equals(
    "todo should belong to Member B",
    todoB.member.id,
    memberB.id,
  );
  TestValidator.notEquals(
    "Member B todo should not belong to Member A",
    todoB.member.id,
    memberA.id,
  );
  // 8. Verify Member A's todo ID is different from Member B's todo ID
  TestValidator.notEquals(
    "todos should have different IDs",
    todoA.id,
    todoB.id,
  );
}
