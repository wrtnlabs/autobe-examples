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

export async function test_api_user_session_search_by_ip_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create task to establish user account existence
  const task = await api.functional.todoList.user.tasks.create(connection, {
    body: {
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ITodoListTask.ICreate,
  });
  typia.assert(task);

  // Step 3: Search sessions with IP address filtering
  // Use a common subnet IP prefix for testing
  const ipPrefix = "192.168.1.";
  const searchResponse = await api.functional.todoList.actors.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        ip_address: ipPrefix, // Partial match for subnet
        page: 1,
        limit: 5,
        sort_by: "last_active_at",
        sort_order: "desc",
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(searchResponse);

  // Step 4: Validate search results
  // Verify pagination is correctly applied
  TestValidator.equals(
    "pagination page matches",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    searchResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records greater than or equal to 0",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages greater than or equal to 0",
    searchResponse.pagination.pages >= 0,
  );

  // Verify data elements are ISummary types (string session IDs)
  TestValidator.predicate(
    "data array is not empty",
    searchResponse.data.length > 0,
  );
  TestValidator.predicate(
    "all data items are strings",
    searchResponse.data.every((item) => typeof item === "string"),
  );

  // Verify session IDs are valid UUIDs since that's what we expect from the system
  TestValidator.predicate(
    "all session IDs are valid UUIDs",
    searchResponse.data.every((sessionId) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        sessionId,
      ),
    ),
  );
}
