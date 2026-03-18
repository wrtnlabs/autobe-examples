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

export async function test_api_todo_edit_history_entry_view_ownership_and_privacy(
  connection: api.IConnection,
): Promise<void> {
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: IMultiUserTodoMember.IAuthorized = await authorize_member_join(
    member1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<boolean>(),
      } satisfies IMultiUserTodoMember.IJoin,
    },
  );
  typia.assert(member1);
  // Scenario 1: success for own todo
  const todoA = await generate_random_multi_user_todo_member_todos_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todoA);
  const updatedA = await api.functional.multiUserTodo.member.todos.update(
    member1Connection,
    {
      todoId: todoA.id,
      body: {
        edited_at: new Date().toISOString(),
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    },
  );
  typia.assert(updatedA);
  const fetchedA =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.at(
      member1Connection,
      {
        todoId: todoA.id,
        editHistoryEntryId: updatedA.id,
      },
    );
  typia.assert(fetchedA);
  TestValidator.predicate(
    "has audit timestamps",
    fetchedA.createdAt.length > 0 && fetchedA.editedAt.length > 0,
  );
  TestValidator.predicate(
    "changes array exists",
    Array.isArray(fetchedA.changes),
  );
  if (fetchedA.changes.length > 0) {
    typia.assert(fetchedA.changes[0]);
  }
  // Scenario 2: same member, mismatched todoId should be rejected
  const todoB = await generate_random_multi_user_todo_member_todos_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todoB);
  const updatedA2 = await api.functional.multiUserTodo.member.todos.update(
    member1Connection,
    {
      todoId: todoA.id,
      body: {
        edited_at: new Date().toISOString(),
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    },
  );
  typia.assert(updatedA2);
  await TestValidator.error(
    "privacy-safe rejection on mismatched todoId",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.at(
        member1Connection,
        {
          todoId: todoB.id,
          editHistoryEntryId: updatedA2.id,
        },
      );
    },
  );
  // Scenario 3: cross-member isolation
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member2);
  await TestValidator.error(
    "privacy-safe rejection across members",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.at(
        member2Connection,
        {
          todoId: todoA.id,
          editHistoryEntryId: updatedA2.id,
        },
      );
    },
  );
}
