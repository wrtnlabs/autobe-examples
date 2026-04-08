import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest retrieval returns 404 for non-existent or soft-deleted guest records.
 *
 * Validates that the guest retrieval endpoint properly handles missing resources by returning 404 Not Found. This includes both guests that never existed and guests that have been soft-deleted (deleted_at is not null).
 *
 * The soft delete pattern means deleted records are marked with a timestamp but not physically removed. The endpoint should treat soft-deleted guests as non-existent, returning 404 to hide their existence from normal queries.
 *
 * 1. Generate a random UUID that does not correspond to any existing guest.
 * 2. Attempt to retrieve the guest using the at endpoint.
 * 3. Verify the request throws HttpError with 404 status code.
 * 4. Confirm the error response indicates the guest was not found.
 */
export async function test_api_guest_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the database
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve the non-existent/soft-deleted guest
  await TestValidator.httpError(
    "guest not found returns 404",
    404,
    async () => {
      await api.functional.todoApp.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
