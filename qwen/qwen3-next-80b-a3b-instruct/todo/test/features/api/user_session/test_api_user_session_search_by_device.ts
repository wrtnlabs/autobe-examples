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

export async function test_api_user_session_search_by_device(
  connection: api.IConnection,
) {
  // 1. Authenticate as a user to establish authorization context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePass123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a task to establish user account existence as required prerequisite
  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // 3. Execute the session search endpoint with device info filter
  // Use a device info value that is realistic and would likely match a real device
  const deviceInfoFilter: string = "Chrome";

  const sessionSearchResponse: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.actors.sessions.index(connection, {
      userId: user.id,
      body: {
        device_info: deviceInfoFilter,
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(sessionSearchResponse);

  // 4. Verify pagination and filtering work correctly
  // Check that response includes the expected pagination structure
  TestValidator.equals(
    "pagination structure matches",
    sessionSearchResponse.pagination,
    {
      current: 1,
      limit: 10,
      records: sessionSearchResponse.pagination.records, // Accept actual count
      pages: Math.ceil(sessionSearchResponse.pagination.records / 10),
    },
  );

  // Verify that data array has the expected length
  TestValidator.predicate(
    "data is not empty",
    sessionSearchResponse.data.length > 0,
  );

  // Verify that all returned sessions have matching device info
  // We can't guarantee exact match since we created a new session, but we can use show partial match (known device part)
  // because the device info in the response is just a string summary (as per DTO definition)
  for (const session of sessionSearchResponse.data) {
    // The ISummary type is simply string, so we can check if it contains the device info fragment
    TestValidator.predicate(
      "session device info contains filter",
      session.includes(deviceInfoFilter),
    );
  }
}
