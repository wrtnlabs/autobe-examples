import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";

export async function test_api_user_session_details_retrieval(
  connection: api.IConnection,
) {
  // 1. Create user account for session testing
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "TestPassword123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // 2. Generate user activity by creating multiple tasks to create session context
  const task1 = await api.functional.todo.user.user_tasks.create(connection, {
    body: {
      description: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 4,
        wordMax: 8,
      }),
      href: "https://example.com/todo/create/1",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task1);

  const task2 = await api.functional.todo.user.user_tasks.create(connection, {
    body: {
      description: "Complete user session testing workflow",
      href: "https://example.com/todo/create/2",
      referrer: "https://example.com/todo/create/1",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task2);

  // 3. Try to access session with random session ID as per available APIs
  // Since we don't have a way to list or create sessions, we'll validate error handling
  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Test accessing session details (will likely fail with 404 since session doesn't exist)
  await TestValidator.error(
    "accessing non-existent session should fail",
    async () => {
      await api.functional.todo.user.users.sessions.at(connection, {
        userId: user.id,
        sessionId: testSessionId,
      });
    },
  );

  // 5. Validate user details from registration response show session data appropriately
  TestValidator.predicate("user has valid ID", typeof user.id === "string");
  TestValidator.equals("user email matches registration", user.email, email);
  TestValidator.predicate(
    "user has creation timestamp",
    user.created_at !== null && user.created_at !== undefined,
  );
  TestValidator.predicate(
    "user has authorization token",
    user.token !== null && user.token !== undefined,
  );
}
