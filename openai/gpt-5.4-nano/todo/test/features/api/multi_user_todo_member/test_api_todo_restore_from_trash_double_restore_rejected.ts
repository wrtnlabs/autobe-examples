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

export async function test_api_todo_restore_from_trash_double_restore_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  const editHistoryBeforeSecondRestore: IMultiUserTodoEditHistoryEntry =
    await api.functional.multiUserTodo.member.trash.restore.restoreFromTrash(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(editHistoryBeforeSecondRestore);
  const firstRestoreEntryId = editHistoryBeforeSecondRestore.id;
  await TestValidator.error(
    "second restore should be rejected because todo is no longer in trash",
    async () => {
      await api.functional.multiUserTodo.member.trash.restore.restoreFromTrash(
        memberConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
  const editHistoryAfterFailedSecondRestore = editHistoryBeforeSecondRestore;
  TestValidator.equals(
    "edit history entry id should remain unchanged",
    editHistoryAfterFailedSecondRestore.id,
    firstRestoreEntryId,
  );
  TestValidator.equals(
    "edit history changes count should remain unchanged",
    editHistoryAfterFailedSecondRestore.changes.length,
    editHistoryBeforeSecondRestore.changes.length,
  );
}
