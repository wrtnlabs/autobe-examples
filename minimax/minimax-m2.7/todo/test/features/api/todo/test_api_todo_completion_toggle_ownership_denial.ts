import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_completion_toggle_ownership_denial(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as Member A who owns the target todo
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuthorized);
  // Step 2: Create a todo owned by Member A to be used in ownership denial test
  const memberATodo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(memberATodo);
  // Step 3: Register and authenticate as Member B who will attempt unauthorized toggle
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 4: Attempt to toggle Member A's todo using Member B's connection
  // Step 5: Assert the system returns a 403 Forbidden error indicating ownership denial
  await TestValidator.httpError(
    "Member B cannot toggle Member A's todo (ownership denial)",
    403,
    async () =>
      await api.functional.multiUserTodo.member.todos.toggle(
        memberBConnection,
        {
          todoId: memberATodo.id,
        },
      ),
  );
}
