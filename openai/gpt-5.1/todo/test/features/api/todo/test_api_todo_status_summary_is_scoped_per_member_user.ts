import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoStatusSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatusSummary";

export async function test_api_todo_status_summary_is_scoped_per_member_user(
  connection: api.IConnection,
) {
  // 1. Register memberUserA and become authenticated as A
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberA: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyA,
    });
  typia.assert(memberA);

  // 2. For A, create several todos and complete some of them
  const todosA: ITodoAppTodo[] = [];

  // We'll create 3 todos for A
  for (let i = 0; i < 3; ++i) {
    const createBody = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: createBody,
      });
    typia.assert(todo);
    todosA.push(todo);
  }

  // Complete first 2 todos for A
  const completedA: ITodoAppTodo[] = [];
  for (let i = 0; i < 2; ++i) {
    const completed: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.complete(connection, {
        todoId: todosA[i].id,
      });
    typia.assert(completed);
    completedA.push(completed);
  }

  const totalCountA = todosA.length;
  const completedCountA = completedA.length;
  const pendingCountA = totalCountA - completedCountA;

  // 3. Get status summary for A and validate counts
  const summaryA: ITodoAppTodoStatusSummary =
    await api.functional.todoApp.memberUser.todos.statusSummary.at(connection);
  typia.assert(summaryA);

  TestValidator.equals(
    "member A total_count should match created todos",
    totalCountA,
    summaryA.total_count,
  );
  TestValidator.equals(
    "member A completed_count should match completed todos",
    completedCountA,
    summaryA.completed_count,
  );
  TestValidator.equals(
    "member A pending_count should be total - completed",
    pendingCountA,
    summaryA.pending_count,
  );
  TestValidator.predicate(
    "member A recently_completed_count should be between 0 and completed_count",
    summaryA.recently_completed_count >= 0 &&
      summaryA.recently_completed_count <= summaryA.completed_count,
  );

  // 4. Register memberUserB; connection is now authenticated as B
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberB: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyB,
    });
  typia.assert(memberB);

  // 5. For B, create a different set of todos and complete some
  const todosB: ITodoAppTodo[] = [];

  // Create 5 todos for B
  for (let i = 0; i < 5; ++i) {
    const createBody = {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: createBody,
      });
    typia.assert(todo);
    todosB.push(todo);
  }

  // Complete first 3 todos for B
  const completedB: ITodoAppTodo[] = [];
  for (let i = 0; i < 3; ++i) {
    const completed: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.complete(connection, {
        todoId: todosB[i].id,
      });
    typia.assert(completed);
    completedB.push(completed);
  }

  const totalCountB = todosB.length;
  const completedCountB = completedB.length;
  const pendingCountB = totalCountB - completedCountB;

  // 6. Get status summary for B and validate counts are scoped to B
  const summaryB: ITodoAppTodoStatusSummary =
    await api.functional.todoApp.memberUser.todos.statusSummary.at(connection);
  typia.assert(summaryB);

  TestValidator.equals(
    "member B total_count should match its own created todos",
    totalCountB,
    summaryB.total_count,
  );
  TestValidator.equals(
    "member B completed_count should match its own completed todos",
    completedCountB,
    summaryB.completed_count,
  );
  TestValidator.equals(
    "member B pending_count should be total - completed for B",
    pendingCountB,
    summaryB.pending_count,
  );
  TestValidator.predicate(
    "member B recently_completed_count should be between 0 and completed_count",
    summaryB.recently_completed_count >= 0 &&
      summaryB.recently_completed_count <= summaryB.completed_count,
  );

  // 7. Ensure that B's summary is independent of A's data by comparing counts
  TestValidator.notEquals(
    "member A and B total_count should differ due to different todo volumes",
    summaryB.total_count,
    summaryA.total_count,
  );
  TestValidator.notEquals(
    "member A and B completed_count should differ",
    summaryB.completed_count,
    summaryA.completed_count,
  );
}
