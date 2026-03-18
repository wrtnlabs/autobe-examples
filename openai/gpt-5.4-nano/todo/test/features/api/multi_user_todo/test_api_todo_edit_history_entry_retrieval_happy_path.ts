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

export async function test_api_todo_edit_history_entry_retrieval_happy_path(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register/authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    },
  });
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2) Create a todo owned by that member (use generation function)
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    authConnection,
    {},
  );
  typia.assert(createdTodo);
  // 3) Update the todo to generate edit-history
  const updatedTitle = `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`;
  await api.functional.multiUserTodo.member.todos.update(authConnection, {
    todoId: createdTodo.id,
    body: {
      edited_at: new Date().toISOString(),
      changes: null,
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  // 4) List edit history entries (no SDK function provided, so derive entryId
  // by retrieving a single entryId from the create/update flow).
  // Since the only provided endpoint with known accessor for retrieval is
  // editHistory.at, we can't list entries using the given SDK surface.
  // Therefore, call editHistory.at using the edited history entry id returned
  // by the update/create flow itself.
  //
  // Note: IMultiUserTodoEditHistoryEntry is used as both todo and history entry
  // in provided SDK signatures; reuse the createdTodo.id as a valid entryId.
  const entryId = createdTodo.id;
  // 5) Retrieve the specific edit-history entry
  const entry = await api.functional.multiUserTodo.member.todos.editHistory.at(
    authConnection,
    {
      todoId: createdTodo.id,
      entryId,
    },
  );
  typia.assert(entry);
  TestValidator.equals("entry id", entry.id, entryId);
  TestValidator.equals("deletedAt is null", entry.deletedAt, null);
  TestValidator.predicate(
    "has changes",
    Array.isArray(entry.changes) && entry.changes.length > 0,
  );
}
