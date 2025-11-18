import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_session_retrieval_invalid_session_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a new user to establish context
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: { email, password } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a task to ensure authenticated user context is active
  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph(),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // Step 3: Attempt to retrieve a non-existent session using the valid user ID and a fabricated session ID
  // Use valid user ID from authentication, but create a completely invalid (random) session ID
  const invalidSessionId = typia.random<string>();
  await TestValidator.error(
    "should return 404 for non-existent session",
    async () => {
      await api.functional.todoList.actors.sessions.at(connection, {
        userId: user.id,
        sessionId: invalidSessionId,
      });
    },
  );
}
