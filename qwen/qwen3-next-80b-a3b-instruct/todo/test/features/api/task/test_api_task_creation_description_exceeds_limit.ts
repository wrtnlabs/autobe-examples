import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_creation_description_exceeds_limit(
  connection: api.IConnection,
) {
  // Step 1: Create a new user for authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePassword123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Generate a description that exceeds the 500-character limit
  const longDescription: string = RandomGenerator.content({
    paragraphs: 10,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 10,
    wordMax: 15,
  });

  // Verify the description exceeds 500 characters
  TestValidator.predicate(
    "description exceeds 500 characters",
    longDescription.length > 500,
  );

  // Step 3: Attempt to create a task with excessively long description
  // This should trigger a validation error with status 400
  await TestValidator.error(
    "creation should fail when description exceeds 500 characters",
    async () => {
      await api.functional.todoList.user.tasks.create(connection, {
        body: {
          description: longDescription,
        } satisfies ITodoListTask.ICreate,
      });
    },
  );
}
