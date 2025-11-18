import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_other_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user account for authentication
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(firstUser);

  // Step 2: Create second user account as target for unauthorized retrieval
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(secondUser);

  // Step 3: Create a task for the target user to satisfy prerequisite condition
  const taskDescription = RandomGenerator.paragraph({ sentences: 5 });
  const createdTask: ITodoListTask =
    await api.functional.todoList.user.tasks.create(connection, {
      body: {
        description: taskDescription,
      } satisfies ITodoListTask.ICreate,
    });
  typia.assert(createdTask);

  // Step 4: Switch authentication context to first user (already authenticated above)
  // No need for explicit login as token is automatically set by join operation

  // Step 5: Attempt to retrieve second user's profile with first user's authenticated connection
  // This should fail due to privacy policy enforcement
  await TestValidator.error(
    "user cannot access other user's profile",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: secondUser.id,
      });
    },
  );

  // Step 6: Verify that the first user can still access their own profile (positive check)
  const ownProfile: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: firstUser.id,
    });
  typia.assert(ownProfile);
  TestValidator.equals("own profile id matches", ownProfile, firstUser.id);
}
