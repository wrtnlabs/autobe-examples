import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTaskCountStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCountStatistics";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_dashboard_user_progress_zero_tasks(
  connection: api.IConnection,
) {
  // Test dashboard user progress when user has no tasks
  // Create a new user account to establish authenticated session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const joinHref = `https://example.com/join`;
  const joinReferrer = `https://example.com/login`;

  const userData = {
    email: userEmail,
    password: userPassword,
    name: RandomGenerator.name(2),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: joinHref,
    referrer: joinReferrer,
  } satisfies ITodoAppUser.ICreate;

  const newUser = await api.functional.auth.user.join(connection, {
    body: userData,
  });
  typia.assert(newUser);

  // Verify user was created successfully
  TestValidator.equals("user email matches input", newUser.email, userEmail);
  TestValidator.notEquals("user token exists", newUser.token.access, "");

  // Get user task count statistics from dashboard endpoint
  const statistics =
    await api.functional.todoApp.user.dashboard.user_progress.userProgress(
      connection,
    );
  typia.assert(statistics);

  // Verify all task counts are zero for new user (zero-state validation)
  TestValidator.equals("total tasks should be zero", statistics.total_tasks, 0);
  TestValidator.equals(
    "completed tasks should be zero",
    statistics.completed_tasks,
    0,
  );
  TestValidator.equals(
    "pending tasks should be zero",
    statistics.pending_tasks,
    0,
  );
  TestValidator.equals(
    "completion rate should be zero percent",
    statistics.completion_rate,
    0,
  );

  // Verify numeric constraints are satisfied
  TestValidator.predicate(
    "total tasks is non-negative",
    statistics.total_tasks >= 0,
  );
  TestValidator.predicate(
    "completed tasks is non-negative",
    statistics.completed_tasks >= 0,
  );
  TestValidator.predicate(
    "pending tasks is non-negative",
    statistics.pending_tasks >= 0,
  );
  TestValidator.predicate(
    "completion rate is within valid range",
    statistics.completion_rate >= 0 && statistics.completion_rate <= 100,
  );
}
