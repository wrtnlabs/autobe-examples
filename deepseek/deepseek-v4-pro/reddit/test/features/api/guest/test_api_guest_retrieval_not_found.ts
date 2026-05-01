import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that retrieving a non-existent guest record returns a 404 Not Found response.
 *
 * Validates that the GET /communityHub/guests/{guestId} endpoint correctly handles
 * the case where no guest record exists with the provided UUID. The test generates
 * a random UUID v4 that is guaranteed not to correspond to any existing guest in
 * the database, then verifies the API returns a 404 status code rather than an
 * empty response or other misleading result.
 *
 * Since the guest retrieval endpoint is public and requires no authentication,
 * the test uses the base connection directly.
 *
 * 1. Generate a random UUID v4 that does not match any existing guest record.
 * 2. Call the guest retrieval endpoint with the random UUID.
 * 3. Verify the response is a 404 Not Found error.
 */
export async function test_api_guest_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "guest not found returns 404",
    404,
    async () => {
      await api.functional.communityHub.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
