import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSession";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_sessions_sort_by_created_at_ascending(
  connection: api.IConnection,
) {
  // Step 1: Create a user account which automatically generates an initial session
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Request sessions sorted by created_at in ascending order (oldest first)
  const sessionsResponse: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "asc",
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionsResponse);

  // Step 3: Validate that sessions are returned in ascending order by created_at
  TestValidator.predicate(
    "sessions list should not be empty",
    sessionsResponse.data.length > 0,
  );

  // Step 4: Verify that sessions are sorted in ascending order (oldest first)
  if (sessionsResponse.data.length > 1) {
    for (let i = 0; i < sessionsResponse.data.length - 1; i++) {
      const currentSession = sessionsResponse.data[i];
      const nextSession = sessionsResponse.data[i + 1];

      const currentTime = new Date(currentSession.created_at).getTime();
      const nextTime = new Date(nextSession.created_at).getTime();

      TestValidator.predicate(
        `session ${i} created_at should be earlier than or equal to session ${i + 1}`,
        currentTime <= nextTime,
      );
    }
  }

  // Step 5: Confirm that the first session has the earliest timestamp
  const firstSession = sessionsResponse.data[0];
  const allCreatedAtTimes = sessionsResponse.data.map((session) =>
    new Date(session.created_at).getTime(),
  );
  const earliestTime = Math.min(...allCreatedAtTimes);

  TestValidator.equals(
    "first session should have the earliest created_at timestamp",
    new Date(firstSession.created_at).getTime(),
    earliestTime,
  );
}
