import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of non-existent guest account returns 404 Not Found.
 *
 * Validates that attempting to retrieve a guest account with an invalid or non-existent UUID returns an HTTP 404 error. This negative test ensures proper error handling when querying for guest records that do not exist in the system.
 *
 * 1. Generate a valid UUID format that does not correspond to any existing guest record.
 * 2. Attempt to retrieve the guest using GET /hrm/guests/{guestId}.
 * 3. Validate that the API throws an HttpError with status code 404.
 */
export async function test_api_guest_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that doesn't exist in the database
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve the non-existent guest and validate 404 error
  await TestValidator.httpError(
    "guest not found returns 404",
    404,
    async () => {
      await api.functional.hrm.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
