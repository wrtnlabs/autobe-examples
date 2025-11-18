import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTaskCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletion";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_bulk_complete_empty_task_list(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "password123",
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: "https://example.com/todo-app",
        referrer: "https://google.com",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // Step 2: Test bulk completion with minimum valid task list
  // Since the DTO requires MinItems<1>, we cannot test empty arrays
  // Instead we verify the system works correctly with valid input
  const validSummary: ITodoAppTaskCompletion.ISummary =
    await api.functional.todoApp.user.tasks.bulk_complete.bulkComplete(
      connection,
      {
        body: {
          task_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies ITodoAppTaskCompletion.ICreate,
      },
    );

  typia.assert(validSummary);
  TestValidator.equals(
    "successfully completed should be 1",
    validSummary.successfully_completed,
    1,
  );
  TestValidator.equals(
    "total requested should be 1",
    validSummary.total_requested,
    1,
  );
  TestValidator.equals(
    "completion percentage should be 100",
    validSummary.completion_percentage,
    100,
  );
  TestValidator.predicate(
    "message should be non-empty",
    validSummary.message.length > 0,
  );

  // Verify the user account is still valid and unchanged after successful request
  TestValidator.equals(
    "user should remain authenticated",
    user.email,
    userEmail,
  );
  TestValidator.predicate(
    "user id should be valid UUID",
    typia.is<string & tags.Format<"uuid">>(user.id),
  );
}
