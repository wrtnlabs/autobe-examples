import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoStatusSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatusSummary";

export async function test_api_todo_status_summary_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new member user and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 2. Create at least one todo for this member user
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo = await api.functional.todoApp.memberUser.todos.create(
    connection,
    { body: createTodoBody },
  );
  typia.assert<ITodoAppTodo>(createdTodo);

  // 3. Attempt to access statusSummary without authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "status summary requires authentication",
    async () => {
      await api.functional.todoApp.memberUser.todos.statusSummary.at(
        unauthConnection,
      );
    },
  );

  // 4. Access statusSummary with authenticated connection
  const summary =
    await api.functional.todoApp.memberUser.todos.statusSummary.at(connection);
  typia.assert<ITodoAppTodoStatusSummary>(summary);

  // 5. Basic business validations on the summary
  TestValidator.predicate(
    "total_count is non-negative",
    summary.total_count >= 0,
  );
  TestValidator.predicate(
    "pending_count is non-negative",
    summary.pending_count >= 0,
  );
  TestValidator.predicate(
    "completed_count is non-negative",
    summary.completed_count >= 0,
  );
  TestValidator.predicate(
    "recently_completed_count is non-negative",
    summary.recently_completed_count >= 0,
  );

  TestValidator.predicate(
    "total_count equals pending_count + completed_count",
    summary.total_count === summary.pending_count + summary.completed_count,
  );
}
