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

export async function test_api_todo_edit_history_entry_deleted_unavailable(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  const editAt1 = new Date().toISOString();
  const editAt2 = new Date(Date.now() + 50).toISOString();
  const createdHistoryOrTodo: IMultiUserTodoEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(createdHistoryOrTodo);
  // Perform edits; omit changes payload because ISummary DTO is entirely null-typed in provided definition.
  const updated1: IMultiUserTodoEditHistoryEntry =
    await api.functional.multiUserTodo.member.todos.update(memberConnection, {
      todoId: createdHistoryOrTodo.id,
      body: {
        edited_at: editAt1,
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    });
  typia.assert(updated1);
  const updated2: IMultiUserTodoEditHistoryEntry =
    await api.functional.multiUserTodo.member.todos.update(memberConnection, {
      todoId: createdHistoryOrTodo.id,
      body: {
        edited_at: editAt2,
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    });
  typia.assert(updated2);
  // Retrieve the edit-history entry.
  const fetched: IMultiUserTodoEditHistoryEntry =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.at(
      memberConnection,
      {
        todoId: createdHistoryOrTodo.id,
        editHistoryEntryId: updated2.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("editedAt matches edit 2", fetched.editedAt, editAt2);
  TestValidator.equals(
    "deletedAt is null for available entry",
    fetched.deletedAt,
    null,
  );
  TestValidator.predicate(
    "changes array exists",
    fetched.changes !== undefined,
  );
  // Permanent delete from trash makes it unavailable.
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: createdHistoryOrTodo.id,
  });
  await api.functional.multiUserTodo.member.trash.erase(memberConnection, {
    todoId: createdHistoryOrTodo.id,
  });
  await TestValidator.error(
    "edit-history entry becomes unavailable after permanent deletion",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.at(
        memberConnection,
        {
          todoId: createdHistoryOrTodo.id,
          editHistoryEntryId: updated2.id,
        },
      );
    },
  );
}
