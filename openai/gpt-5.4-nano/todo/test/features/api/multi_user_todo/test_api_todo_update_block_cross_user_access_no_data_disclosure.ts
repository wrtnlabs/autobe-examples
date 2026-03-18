import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_update_block_cross_user_access_no_data_disclosure(
  connection: api.IConnection,
): Promise<void> {
  // Cross-user privacy test: member B cannot update member A's todo.
  // 1) Actor-specific connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // 2) Authorize member A and member B
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: false,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  // 3) Member A creates a todo; capture identifier used by the update endpoint
  const memberATodo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: typia.random<string & tags.MinLength<1>>(),
        description: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(memberATodo);
  const todoId = memberATodo.id;
  // 4) Member B attempts to update member A’s todo
  const updatePayload = {
    edited_at: new Date().toISOString(),
    changes: null,
  } satisfies IMultiUserTodoEditHistoryEntry.IUpdate;
  await TestValidator.httpError(
    "cross-user update should be rejected without data disclosure",
    [400, 401, 403, 404],
    async () => {
      await api.functional.multiUserTodo.member.todos.update(
        memberBConnection,
        {
          todoId,
          body: updatePayload,
        },
      );
    },
  );
  TestValidator.predicate("member A created a todoId", todoId.length > 0);
}
