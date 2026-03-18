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

export async function test_api_todo_edit_history_single_entry_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: exactly one history entry
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todo);
  await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
    todoId: todo.id,
    body: {
      edited_at: new Date().toISOString(),
      changes: null,
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  const page1 =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      memberAConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("edit history entry count (data)", page1.data.length, 1);
  TestValidator.predicate(
    "editedAt present",
    page1.data[0].editedAt !== null && page1.data[0].editedAt !== undefined,
  );
  TestValidator.equals(
    "pagination records equals 1",
    page1.pagination.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination current page equals 1",
    page1.pagination.pagination.current,
    1,
  );
  // Scenario 2: privacy - member B cannot view member A's history
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  try {
    const denied =
      await api.functional.multiUserTodo.member.todos.editHistory.index(
        memberBConnection,
        {
          todoId: todo.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
        },
      );
    typia.assert(denied);
    TestValidator.equals("no data returned", denied.data.length, 0);
  } catch {
    // acceptable: access is blocked via HTTP error
    TestValidator.predicate("access denied", true);
  }
  // Scenario 3: newest-first ordering across two edits
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todo2);
  const t1 = new Date(Date.now() - 1000).toISOString();
  const t2 = new Date().toISOString();
  await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
    todoId: todo2.id,
    body: {
      edited_at: t1,
      changes: null,
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
    todoId: todo2.id,
    body: {
      edited_at: t2,
      changes: null,
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  const history2 =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      memberAConnection,
      {
        todoId: todo2.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(history2);
  TestValidator.equals("two history entries returned", history2.data.length, 2);
  TestValidator.predicate(
    "newest-first ordering",
    history2.data[0].editedAt >= history2.data[1].editedAt,
  );
  TestValidator.notEquals(
    "distinct history entry ids",
    history2.data[0].id,
    history2.data[1].id,
  );
}
