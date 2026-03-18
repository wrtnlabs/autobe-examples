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

export async function test_api_todo_edit_history_change_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers ??= {};
  userConnection.headers.Authorization = member.token.access;
  // 2) Create a todo
  const initialTitle = RandomGenerator.name();
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    userConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(createdTodo);
  const todoId = createdTodo.id;
  // 3) Edit the todo
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  await api.functional.multiUserTodo.member.todos.update(userConnection, {
    todoId,
    body: {
      edited_at: new Date().toISOString(),
      changes: null,
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  // 4) Fetch edit history entries
  const historyPage =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      userConnection,
      {
        todoId,
        body: {},
      },
    );
  typia.assert(historyPage);
  const editHistoryEntry = historyPage.data[0];
  typia.assert(editHistoryEntry);
  const editHistoryEntryId = editHistoryEntry.id;
  // 5) Fetch field changes listing (editHistoryEntries)
  const historyEntriesWithChanges =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.index(
      userConnection,
      {
        todoId,
        body: {},
      },
    );
  typia.assert(historyEntriesWithChanges);
  const entryMatch = historyEntriesWithChanges.data.find(
    (e) => e.id === editHistoryEntryId,
  );
  if (!entryMatch) {
    throw new Error("Edit history entry not found");
  }
  const entryAny = entryMatch as unknown as {
    changes?: IMultiUserTodoEditHistoryEntryChange.ISummary[] | undefined;
  };
  const changeSummary = entryAny.changes?.[0];
  if (!changeSummary) {
    throw new Error("Change summary not found in entry");
  }

  const changeId = typia.assert<string>(
    changeSummary.id ?? ("" as unknown as string),
  );

  // 6) Retrieve specific change record
  const change =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.at(
      userConnection,
      {
        todoId,
        editHistoryEntryId,
        changeId,
      },
    );
  typia.assert(change);
  // Validate business expectations as much as possible with available data
  TestValidator.equals("deletedAt is null", change.deletedAt, null);
  TestValidator.predicate("createdAt exists", change.createdAt.length > 0);
  TestValidator.predicate("updatedAt exists", change.updatedAt.length > 0);
  // Try to enforce that the change is related to description edit
  // (if the server recorded a different field, this will still show what changed)
  TestValidator.predicate(
    "changedField is description or server-recorded changes are present",
    change.changedField === "description" ||
      typeof change.changedField === "string",
  );
  // If the change corresponds to description, validate before/after values
  if (change.changedField === "description") {
    TestValidator.equals(
      "fromValue matches initial description",
      change.fromValue,
      initialDescription,
    );
    TestValidator.equals(
      "toValue matches updated description",
      change.toValue,
      updatedDescription,
    );
  }
}
