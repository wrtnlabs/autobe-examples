import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IError } from "@ORGANIZATION/PROJECT-api/lib/structures/IError";
import type { ITodoAppTaskDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDeletion";
import type { ITodoAppTaskId } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskId";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test bulk deletion validation when submitting empty task array or invalid
 * request structure. Validates that the operation correctly rejects requests
 * without task IDs, ensuring data safety and preventing accidental deletion of
 * zero tasks. Focuses on input validation and error handling for malformed bulk
 * deletion requests.
 */
export async function test_api_task_bulk_delete_empty_request_validation(
  connection: api.IConnection,
) {
  // Create authenticated user for testing bulk deletion validation
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        ip: null,
        href: "https://todoapp.example.com/join",
        referrer: "https://todoapp.example.com/welcome",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // Test 1: Empty task_ids array (violates MinItems<1> constraint)
  await TestValidator.error(
    "bulk delete with empty task array should fail",
    async () => {
      await api.functional.todoApp.user.tasks.bulk_delete.bulkDelete(
        connection,
        {
          body: {
            task_ids: [],
          } satisfies ITodoAppTaskDeletion.ICreate,
        },
      );
    },
  );

  // Test 2: Multiple attempts to ensure consistent validation
  await TestValidator.error(
    "bulk delete with no task IDs should consistently fail",
    async () => {
      await api.functional.todoApp.user.tasks.bulk_delete.bulkDelete(
        connection,
        {
          body: {
            task_ids: [] satisfies ITodoAppTaskId[],
          } satisfies ITodoAppTaskDeletion.ICreate,
        },
      );
    },
  );

  // Test 3: Verify that valid request would succeed (create some test data first if needed)
  const validTaskId = {
    id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ITodoAppTaskId;

  const validRequestBody = {
    task_ids: [validTaskId],
  } satisfies ITodoAppTaskDeletion.ICreate;

  // Note: This would normally be tested with actual task creation workflow,
  // but since we don't have task creation endpoints in this scope, we focus
  // on the validation aspects of the bulk delete operation
}
