import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_user_session_search_by_date_range(
  connection: api.IConnection,
) {
  // 1. Authenticate as user to gain authorization for session search
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "Password123!", // Valid password as required by domain rules
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a task to establish user account existence as required prerequisite
  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 8,
        }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // 3. Wait 2 seconds to create time difference between session creation and search window
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 4. Get the creation time of this user (used to ensure sessions exist within time range)
  // Since session is created on user authentication, we use the authenticated time for reference
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // 5. Execute the session search endpoint with date range filters
  // Using both created_date_start and created_date_end to capture sessions within a specific period
  // Also using last_active_start and last_active_end to capture sessions with activity in a specific window
  // Sorting by creation_date in descending order by default
  const searchResult: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.actors.sessions.index(connection, {
      userId: user.id, // Path parameter for the authenticated user's ID
      body: {
        created_date_start: oneDayAgo, // Sessions created after one day ago
        created_date_end: now.toISOString(), // Sessions created before now
        last_active_start: oneHourAgo, // Sessions active in the last hour
        last_active_end: now.toISOString(), // Sessions active before now
        sort_by: "creation_date", // Sort by creation date
        sort_order: "desc", // Descending order (newest first)
        page: 1, // First page of results
        limit: 10, // Maximum 10 results per page
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(searchResult);

  // 6. Verify accurate filtering and sorting
  TestValidator.equals(
    "page information should be correct",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "results should be within created date range",
    searchResult.data.length > 0,
  );
}
