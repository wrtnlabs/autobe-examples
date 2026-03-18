import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
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

export async function test_api_todo_permanent_delete_from_trash_success_and_permissions(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------
  // Scenario A: success
  // -----------------------------
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const todoA = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todoA);
  // Move from active todos into trash
  await api.functional.multiUserTodo.member.todos.erase(memberAConnection, {
    todoId: todoA.id,
  });
  // Permanently delete from trash
  const todoAId = todoA.id;
  await api.functional.multiUserTodo.member.trash.erase(memberAConnection, {
    todoId: todoAId,
  });
  // Validate absence in active list
  const activeListA = await api.functional.multiUserTodo.member.todos.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 100,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(activeListA);
  TestValidator.predicate(
    "todo should not exist in active list",
    () => !activeListA.data.some((t) => t.id === todoAId),
  );
  // Validate absence in trash list
  const trashListA = await api.functional.multiUserTodo.member.trash.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 100,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(trashListA);
  TestValidator.predicate(
    "todo should not exist in trash list",
    () => !trashListA.data.some((t) => t.id === todoAId),
  );
  // Validate trash GET by id fails
  await TestValidator.error(
    "trash get should fail after permanent deletion",
    async () => {
      await api.functional.multiUserTodo.member.trash.at(memberAConnection, {
        todoId: todoAId,
      });
    },
  );
  // Validate edit history GET by id fails
  await TestValidator.error(
    "edit history should be removed after permanent deletion",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistory.index(
        memberAConnection,
        {
          todoId: todoAId,
          body: { page: 1, limit: 10 },
        },
      );
    },
  );
  // -----------------------------
  // Scenario B: cross-user permissions
  // -----------------------------
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: false,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const todoB = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todoB);
  await api.functional.multiUserTodo.member.todos.erase(memberAConnection, {
    todoId: todoB.id,
  });
  await TestValidator.error(
    "cross-user permanent delete from trash should fail",
    async () => {
      await api.functional.multiUserTodo.member.trash.erase(memberBConnection, {
        todoId: todoB.id,
      });
    },
  );
  // Member A should still be able to see it in trash
  const trashListAfterCrossA =
    await api.functional.multiUserTodo.member.trash.index(memberAConnection, {
      body: {
        page: 1,
        limit: 100,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    });
  typia.assert(trashListAfterCrossA);
  TestValidator.predicate(
    "member A todo should remain in trash after cross-user attempt",
    () => trashListAfterCrossA.data.some((t) => t.id === todoB.id),
  );
  // -----------------------------
  // Scenario C: idempotency / second delete
  // -----------------------------
  await api.functional.multiUserTodo.member.trash.erase(memberAConnection, {
    todoId: todoB.id,
  });
  await TestValidator.error(
    "second permanent delete attempt should fail",
    async () => {
      await api.functional.multiUserTodo.member.trash.erase(memberAConnection, {
        todoId: todoB.id,
      });
    },
  );
  const activeListC = await api.functional.multiUserTodo.member.todos.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 100,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(activeListC);
  TestValidator.predicate(
    "todo should not exist in active list after second delete",
    () => !activeListC.data.some((t) => t.id === todoB.id),
  );
  const trashListC = await api.functional.multiUserTodo.member.trash.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 100,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(trashListC);
  TestValidator.predicate(
    "todo should not exist in trash list after second delete",
    () => !trashListC.data.some((t) => t.id === todoB.id),
  );
  await TestValidator.error(
    "trash get should fail after idempotency second delete",
    async () => {
      await api.functional.multiUserTodo.member.trash.at(memberAConnection, {
        todoId: todoB.id,
      });
    },
  );
  await TestValidator.error(
    "edit history should remain removed after idempotency second delete",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistory.index(
        memberAConnection,
        {
          todoId: todoB.id,
          body: { page: 1, limit: 10 },
        },
      );
    },
  );
}
