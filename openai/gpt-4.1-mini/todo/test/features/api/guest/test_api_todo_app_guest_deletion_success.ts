import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
/**
 * Test scenario for verifying the successful deletion of a guest user account
 * in the Todo app.
 *
 * This test validates that a guest user identified by a valid UUID can be
 * deleted using the DELETE /todoApp/guests/{guestId} API endpoint. This
 * operation requires no authentication. The test creates a valid UUID guestId,
 * calls the erase API with isolated connection, and ensures no exception occurs
 * signifying successful deletion.
 *
 * There are no prerequisites or dependencies for this scenario, and the
 * response contains no payload. The test focuses on proper connection
 * isolation, valid path parameter, and successful use of the erase function.
 */
export async function test_api_todo_app_guest_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create an isolated connection for the guest user (no authentication required)
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a valid guestId with UUID format
  const guestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the guest deletion API
  await api.functional.todoApp.guests.erase(guestConnection, { guestId });
}
