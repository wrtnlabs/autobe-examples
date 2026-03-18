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
import { generate_random_multi_user_todo_member_todos_edit_history_entries_create } from "../../../generate/generate_random_multi_user_todo_member_todos_edit_history_entries_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_edit_history_create_own_todo_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member auth
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2) Create todo owned by the authenticated member
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3) Create edit history entry for own todo
  const output =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      memberConnection,
      {
        params: { todoId: todo.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          startDate: null,
          dueDate: null,
        },
      },
    );
  typia.assert(output);
  // 4) Validate response mapping
  TestValidator.equals("edit entry deletedAt is null", output.deletedAt, null);
  TestValidator.predicate(
    "changes array is non-empty",
    () => output.changes.length > 0,
  );
  for (const change of output.changes) {
    typia.assert(change);
    TestValidator.equals("change deletedAt is null", change.deletedAt, null);
  }
}
