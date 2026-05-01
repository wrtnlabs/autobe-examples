import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a non-existent guest identity returns 404 Not Found.
 *
 * Validates the error handling behavior of the guest identity retrieval endpoint when the requested guest does not exist in the system. The endpoint is publicly accessible without authentication, so the 404 response confirms proper resource-not-found semantics rather than an authorization rejection.
 *
 * 1. Generate a random UUID v4 that does not correspond to any existing guest.
 * 2. Call GET /todoApp/guests/{guestId} with the random UUID.
 * 3. Verify the response is an HTTP 404 Not Found error.
 */
export async function test_api_guest_identity_not_found(
  connection: api.IConnection,
): Promise<void> {
  const guestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent guest identity",
    404,
    async () => {
      await api.functional.todoApp.guests.at(connection, { guestId });
    },
  );
}
