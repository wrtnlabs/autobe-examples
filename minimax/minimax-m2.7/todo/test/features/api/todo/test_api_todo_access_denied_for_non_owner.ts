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

export async function test_api_todo_access_denied_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A and create a todo owned by member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuthorized);
  // Create todo for member A
  const memberATodo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(memberATodo);
  // Step 2: Register member B (different user context)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 3: Member B attempts to retrieve member A's todo
  // This should fail with 404 - resource not found
  await TestValidator.httpError(
    "member B cannot access member A's todo",
    404,
    async () =>
      await api.functional.multiUserTodo.member.todos.at(memberBConnection, {
        todoId: memberATodo.id,
      }),
  );
}
