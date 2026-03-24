import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_erase_blocks_non_owned_todo_access(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // Authenticate two distinct members
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  // As member A, create a todo
  const todoA: ITodoAppTodo =
    await generate_random_todo_app_member_todos_create(memberAConnection, {
      body: {
        title: typia.random<string & tags.MinLength<1>>(),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoA);
  // Act as member B: attempt to erase member A's todo (should fail)
  await TestValidator.httpError(
    "member B cannot erase member A's todo",
    [400, 401, 403, 404],
    async () => {
      await api.functional.todoApp.member.todos.erase(memberBConnection, {
        todoId: todoA.id,
      });
    },
  );
  // Verify from member A: todo remains visible in A list and not moved to trash
  const memberAListBefore: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberAConnection, {
      body: {
        completionStatusFilter: "all",
        sortBy: "created_at",
        sortDirection: "asc",
        page: 1,
        limit: 100,
      },
    });
  typia.assert(memberAListBefore);
  const aTodoInList = memberAListBefore.data.find((t) => t.id === todoA.id);
  TestValidator.predicate(
    "member A can still see its todo",
    () => aTodoInList !== undefined,
  );
  TestValidator.equals(
    "member A's todo is not in trash",
    aTodoInList?.deleted_in_trash_at ?? null,
    null,
  );
  // Verify from member B: todo is not visible in either normal or trash
  const memberBListAfter: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberBConnection, {
      body: {
        completionStatusFilter: "all",
        sortBy: "created_at",
        sortDirection: "asc",
        page: 1,
        limit: 100,
      },
    });
  typia.assert(memberBListAfter);
  const bTodoInList = memberBListAfter.data.find((t) => t.id === todoA.id);
  TestValidator.predicate(
    "member B does not see member A's todo",
    () => bTodoInList === undefined,
  );
  // Re-try the forbidden erase attempt again as member B
  await TestValidator.httpError(
    "member B cannot erase member A's todo (retry)",
    [400, 401, 403, 404],
    async () => {
      await api.functional.todoApp.member.todos.erase(memberBConnection, {
        todoId: todoA.id,
      });
    },
  );
  // Validate again: member A unchanged
  const memberAListAfterRetry: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberAConnection, {
      body: {
        completionStatusFilter: "all",
        sortBy: "created_at",
        sortDirection: "asc",
        page: 1,
        limit: 100,
      },
    });
  typia.assert(memberAListAfterRetry);
  const aTodoAfterRetry = memberAListAfterRetry.data.find(
    (t) => t.id === todoA.id,
  );
  TestValidator.predicate(
    "member A still sees its todo after retry",
    () => aTodoAfterRetry !== undefined,
  );
  TestValidator.equals(
    "member A's todo still not in trash after retry",
    aTodoAfterRetry?.deleted_in_trash_at ?? null,
    null,
  );
  // Validate again: member B unchanged
  const memberBListAfterRetry: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberBConnection, {
      body: {
        completionStatusFilter: "all",
        sortBy: "created_at",
        sortDirection: "asc",
        page: 1,
        limit: 100,
      },
    });
  typia.assert(memberBListAfterRetry);
  const bTodoAfterRetry = memberBListAfterRetry.data.find(
    (t) => t.id === todoA.id,
  );
  TestValidator.predicate(
    "member B still does not see member A's todo after retry",
    () => bTodoAfterRetry === undefined,
  );
}
