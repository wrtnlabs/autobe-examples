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

export async function test_api_todo_erase_blocks_cross_user_todo_access(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2) Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 3) Member A creates a todo and records todoA.id
  const todoA = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todoA);
  const trashRequest = {
    page: 1,
    limit: 10,
    completionStatus: "all",
    sortBy: "createdAt",
    sortOrder: "asc",
  } satisfies IMultiUserTodoGuest.IRequest;
  // 4) Snapshot Member B trash before
  const trashBefore: IPageIMultiUserTodo.ISummary =
    await api.functional.multiUserTodo.member.trash.index(memberBConnection, {
      body: trashRequest,
    });
  typia.assert(trashBefore);
  // 5) Member B attempts to erase Member A's todo
  await TestValidator.error("member B cannot erase member A todo", async () => {
    await api.functional.multiUserTodo.member.todos.erase(memberBConnection, {
      todoId: todoA.id,
    });
  });
  // 6) Snapshot Member B trash after: ensure unchanged
  const trashAfter: IPageIMultiUserTodo.ISummary =
    await api.functional.multiUserTodo.member.trash.index(memberBConnection, {
      body: trashRequest,
    });
  typia.assert(trashAfter);
  TestValidator.equals("trash unchanged", trashAfter, trashBefore);
  // Optional additional validation:
  // Move todoA into trash, then attempt again as member B.
  await api.functional.multiUserTodo.member.todos.erase(memberAConnection, {
    todoId: todoA.id,
  });
  await TestValidator.error(
    "member B still cannot erase member A todo after it is in trash",
    async () => {
      await api.functional.multiUserTodo.member.todos.erase(memberBConnection, {
        todoId: todoA.id,
      });
    },
  );
  const trashAfterOptional: IPageIMultiUserTodo.ISummary =
    await api.functional.multiUserTodo.member.trash.index(memberBConnection, {
      body: trashRequest,
    });
  typia.assert(trashAfterOptional);
  TestValidator.equals(
    "trash unchanged after optional attempt",
    trashAfterOptional,
    trashBefore,
  );
}
