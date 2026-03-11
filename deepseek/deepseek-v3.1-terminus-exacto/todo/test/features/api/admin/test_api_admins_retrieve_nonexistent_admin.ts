import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test error response when attempting to retrieve details for a non-existent admin ID.
 * Generate a valid UUID that doesn't correspond to any existing admin account.
 * Call the GET endpoint with this non-existent UUID.
 * Expect the system to return a 404 Not Found error or appropriate error response
 * indicating the admin was not found.
 * Validate the error response contains a clear message about the admin not existing.
 * Ensure the system properly handles this business error case without crashing
 * or exposing internal errors.
 */
export async function test_api_admins_retrieve_nonexistent_admin(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that is guaranteed to not exist in the database
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // Call the API with the non-existent ID and expect a 404 error
  await TestValidator.httpError(
    "non-existent admin retrieval",
    404,
    async () => {
      await api.functional.multiUserTodo.admins.at(connection, {
        adminId: nonExistentAdminId,
      });
    },
  );
}
