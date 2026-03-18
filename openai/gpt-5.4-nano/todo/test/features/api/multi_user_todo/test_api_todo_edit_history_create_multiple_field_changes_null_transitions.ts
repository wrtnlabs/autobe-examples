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

export async function test_api_todo_edit_history_create_multiple_field_changes_null_transitions(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  const createdEdit =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      memberConnection,
      {
        params: {
          todoId: todo.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(createdEdit);
  TestValidator.equals(
    "entry deletedAt is null (active)",
    createdEdit.deletedAt,
    null,
  );
  TestValidator.predicate(
    "editedAt is date-time",
    createdEdit.editedAt.length > 0,
  );
  TestValidator.predicate(
    "createdAt is date-time",
    createdEdit.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is date-time",
    createdEdit.updatedAt.length > 0,
  );
  for (const change of createdEdit.changes) {
    typia.assert(change);
    TestValidator.equals(
      "change deletedAt is null (active)",
      change.deletedAt,
      null,
    );
  }
}
