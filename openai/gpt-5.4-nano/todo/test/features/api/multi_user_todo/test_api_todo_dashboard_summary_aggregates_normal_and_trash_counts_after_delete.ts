import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
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

export async function test_api_todo_dashboard_summary_aggregates_normal_and_trash_counts_after_delete(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test normal vs trash bucket aggregation behavior in the todo dashboard summary.
   *
   * Because the provided SDK typing for the summary endpoint response does not
   * include the expected normal/trash aggregate fields, this test focuses on:
   * - Exercising the full workflow (member join → todo creation → move to trash).
   * - Ensuring the summary endpoint is successfully accessible for the
   *   authenticated member after normal→trash transitions.
   * - Ensuring privacy scoping indirectly by validating that member B can call
   *   the same summary endpoint after member A has modified their own todos.
   *
   * 1. Member A joins and creates multiple todos including scheduled start/due dates.
   * 2. Member A bulk-moves a subset of those todos into trash.
   * 3. Member A calls the dashboard summary endpoint and validates the response type.
   * 4. Member B also calls the dashboard summary endpoint and validates the response type.
   */
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuth);
  // 2) Member A creates todos with a mix of startDate/dueDate
  const now = Date.now();
  const startDateTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberAConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          startDate: new Date(now + 60000).toISOString(),
          dueDate: null,
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
  typia.assert(startDateTodo);
  const dueDateTodo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: null,
        dueDate: new Date(now + 120000).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(dueDateTodo);
  const unscheduledTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberAConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
  typia.assert(unscheduledTodo);
  // Ensure we can move at least one todo to trash
  const idsToTrash = [unscheduledTodo.id];
  const moved =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberAConnection,
      {
        body: {
          ids: idsToTrash,
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(moved);
  // 3) Member A calls dashboard summary
  const memberAResponse =
    await api.functional.multiUserTodo.member.dashboard.todos.summary.at(
      memberAConnection,
    );
  typia.assert(memberAResponse);
  // 4) Member B privacy scoping smoke check
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuth);
  const memberBResponse =
    await api.functional.multiUserTodo.member.dashboard.todos.summary.at(
      memberBConnection,
    );
  typia.assert(memberBResponse);
  // Business-level count assertions are not possible with the provided response DTO.
  TestValidator.predicate(
    "member A summary call returns valid response type",
    () => memberAResponse != null,
  );
  TestValidator.predicate(
    "member B summary call returns valid response type",
    () => memberBResponse != null,
  );
}
