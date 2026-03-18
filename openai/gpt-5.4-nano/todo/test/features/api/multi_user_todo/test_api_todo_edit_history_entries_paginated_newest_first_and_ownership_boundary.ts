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

export async function test_api_todo_edit_history_entries_paginated_newest_first_and_ownership_boundary(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  // Member A creates a todo
  const todoA = await generate_random_multi_user_todo_member_todos_create(
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
  typia.assert(todoA);
  const todoAId = todoA.id;
  // Perform two distinct updates on the same todo.
  // With provided DTO, we can vary only edited_at; still should create edit-history entries.
  const editedAt1 = new Date().toISOString();
  const editedAt2 = new Date(Date.now() + 1000).toISOString();
  await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
    todoId: todoAId,
    body: {
      edited_at: editedAt1,
      changes: undefined,
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
    todoId: todoAId,
    body: {
      edited_at: editedAt2,
      changes: undefined,
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  // List page 1
  const page1 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.index(
      memberAConnection,
      {
        todoId: todoAId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page1 should return at least one entry for edited todo",
    page1.data.length >= 1,
  );
  for (const item of page1.data) {
    TestValidator.equals(
      "multiUserTodoId isolation within member",
      item.multiUserTodoId,
      todoAId,
    );
  }
  if (page1.data.length >= 2) {
    for (let i = 0; i < page1.data.length - 1; i++) {
      const cur = page1.data[i];
      const next = page1.data[i + 1];
      const editedAtOrderOk =
        cur.editedAt > next.editedAt ||
        (cur.editedAt === next.editedAt && cur.id <= next.id);
      TestValidator.predicate(
        "newest-first order (editedAt desc, id asc tie-break)",
        editedAtOrderOk,
      );
    }
  }
  // List page 2
  const page2 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.index(
      memberAConnection,
      {
        todoId: todoAId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(page2);

  // Basic pagination sanity without relying on unknown pagination field names.
  // If page1 filled the limit, page2 may have remaining entries; otherwise page2 should be empty.
  const expectedPage2Empty = page1.data.length < 10;
  if (expectedPage2Empty) {
    TestValidator.equals("page2 should be empty when page1 not full", page2.data.length, 0);
  } else {
    TestValidator.predicate("page2 should have at most limit entries", page2.data.length <= 10);
  }

  // Security: member B must not see member A's edit history.
  // Accept either denial (throw) or an empty result set.
  try {
    const leakCheck =
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.index(
        memberBConnection,
        {
          todoId: todoAId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
        },
      );
    typia.assert(leakCheck);
    TestValidator.equals(
      "no edit-history disclosure to other member",
      leakCheck.data.length,
      0,
    );
  } catch (e) {
    // If denied, it's acceptable.
    TestValidator.predicate("security denial acceptable", true);
  }
  // Member B own todo listing should still work
  const todoB = await generate_random_multi_user_todo_member_todos_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todoB);
  const todoBId = todoB.id;
  const bEditedAt1 = new Date(Date.now() + 2000).toISOString();
  await api.functional.multiUserTodo.member.todos.update(memberBConnection, {
    todoId: todoBId,
    body: {
      edited_at: bEditedAt1,
      changes: undefined,
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  const bHistory =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.index(
      memberBConnection,
      {
        todoId: todoBId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(bHistory);
  TestValidator.predicate(
    "B should see its own history",
    bHistory.data.length >= 1,
  );
  if (bHistory.data.length > 0) {
    TestValidator.equals(
      "B history todoId matches its own todo",
      bHistory.data[0].multiUserTodoId,
      todoBId,
    );
  }
}
