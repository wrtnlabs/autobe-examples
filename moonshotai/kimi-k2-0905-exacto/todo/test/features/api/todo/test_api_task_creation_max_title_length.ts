import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_creation_max_title_length(
  connection: api.IConnection,
) {
  // Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com/referral",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Generate a title with exactly 200 characters (maximum allowed)
  const maxTitle = ArrayUtil.repeat(200, (i) => "A").join("");

  // Test task creation with exactly 200 character title (should succeed)
  const taskWithMaxTitle = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: maxTitle,
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskWithMaxTitle);
  TestValidator.equals("max title length accepted", maxTitle.length, 200);
  TestValidator.equals(
    "task created with max title",
    taskWithMaxTitle.title,
    maxTitle,
  );
  TestValidator.equals(
    "task status correct",
    taskWithMaxTitle.status,
    "pending",
  );

  // Test task creation with 201 character title (should fail)
  const overLimitTitle = maxTitle + "X";
  TestValidator.equals("over limit title length", overLimitTitle.length, 201);

  await TestValidator.error(
    "title exceeding 200 characters should fail",
    async () => {
      await api.functional.todoApp.user.tasks.create(connection, {
        body: {
          title: overLimitTitle,
          status: "pending",
        } satisfies ITodoAppTask.ICreate,
      });
    },
  );

  // Validate the actual title lengths and boundary conditions
  TestValidator.predicate(
    "max title has exactly 200 characters",
    maxTitle.length === 200,
  );
  TestValidator.predicate(
    "over limit title exceeds 200 characters",
    overLimitTitle.length === 201,
  );

  // Verify successful task has proper title length constraint
  TestValidator.predicate(
    "created task title matches constraint",
    taskWithMaxTitle.title.length === 200,
  );
}
