import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
import type { IPageIMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistoryEntry";
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

export async function test_api_todo_edit_history_change_retrieval_after_delete_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true satisfies boolean,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todo);
  // Update should create an edit-history entry with at least one field-level change.
  // IMultiUserTodoEditHistoryEntry.IUpdate only supports optional edited_at and optional changes (null/undefined).
  // Passing `changes: undefined` means rely on server to compute change records for the edit.
  const updated = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        changes: undefined,
      },
    },
  );
  typia.assert(updated);
  TestValidator.predicate(
    "should have at least one field-level change",
    updated.changes.length > 0,
  );
  const targetChange = updated.changes[0];
  typia.assert(targetChange);

  const changeId = typia.assert(targetChange.id!);

  await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.erase(
    memberConnection,
    {
      todoId: todo.id,
      editHistoryEntryId: updated.id,
      changeId,
    },
  );
  try {
    const retrieved =
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.at(
        memberConnection,
        {
          todoId: todo.id,
          editHistoryEntryId: updated.id,
          changeId,
        },
      );
    typia.assert(retrieved);
    TestValidator.predicate(
      "deletedAt should be non-null for a deleted change",
      retrieved.deletedAt !== null,
    );
  } catch (exp) {
    throw exp;
  }
}
