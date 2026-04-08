import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import type { IPageIMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_delete_rejects_non_owner_todo_id(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a member cannot delete another member’s todo by reusing a non-owned todoId.
   *
   * Validates the complete ownership-isolation flow:
   * 1. Member A joins and creates a todo.
   * 2. Member B joins independently.
   * 3. Member B attempts to delete Member A’s todo id.
   * 4. The deletion must be rejected (non-204) and must not alter Member A’s todo visibility.
   * 5. Member B must not observe Member A’s todo via dashboard summary.
   */
  // 1) Member A joins.
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(memberAAuth);

  // 2) Member A creates a todo; capture todoId.
  const memberATodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberAConnection,
      typia.assert<{
        body?: {
          title?: string | undefined;
          description?: string | null | undefined;
          startDate?:
            | (string & tags.Format<"date-time">)
            | null
            | undefined;
          dueDate?:
            | (string & tags.Format<"date-time">)
            | null
            | undefined;
        };
      }>({}),
    );
  typia.assert(memberATodo);

  // 3) Member B joins (different authenticated identity).
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(memberBAuth);

  // 4) Member B attempts to delete Member A’s todoId.
  await TestValidator.httpError(
    "delete should be rejected for non-owner todoId",
    [400, 401, 403, 404],
    async () => {
      await api.functional.multiUserTodo.member.todos.erase(memberBConnection, {
        todoId: memberATodo.id,
      });
    },
  );

  // 5.1) Verify Member A’s todo remains visible in normal list.
  const memberANormalTodos =
    await api.functional.multiUserTodo.member.todos.search(memberAConnection, {
      body: {
        trashState: "normal",
        searchText: memberATodo.title,
        sortBy: "createdAt",
        sortDirection: "newestFirst",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodo.IRequest,
    });
  typia.assert(memberANormalTodos);
  TestValidator.predicate(
    "member A normal list should include own todo",
    ArrayUtil.has(memberANormalTodos.data, (t) => t.id === memberATodo.id),
  );

  // 5.2) Verify Member A’s todo is not moved into trash.
  const memberATrashTodos =
    await api.functional.multiUserTodo.member.todos.search(memberAConnection, {
      body: {
        trashState: "trash",
        searchText: memberATodo.title,
        sortBy: "createdAt",
        sortDirection: "newestFirst",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodo.IRequest,
    });
  typia.assert(memberATrashTodos);
  TestValidator.predicate(
    "member A trash list should not include own todo after failed delete",
    !ArrayUtil.has(memberATrashTodos.data, (t) => t.id === memberATodo.id),
  );

  // 5.3) Verify Member B cannot observe Member A’s todo in dashboard summary.
  const memberBDashboardSummary =
    await api.functional.multiUserTodo.member.dashboard.todos.summary.at(
      memberBConnection,
    );
  typia.assert(memberBDashboardSummary);
  TestValidator.notEquals(
    "dashboard summary must not expose member A todo id",
    memberBDashboardSummary.todoId,
    memberATodo.id,
  );
}
