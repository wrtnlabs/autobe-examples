import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of a non-existent guest invitation record returns 404.
 *
 * Validates that attempting to retrieve a guest invitation with a non-existent UUID properly returns an HTTP 404 error. This ensures the API correctly handles requests for missing resources without leaking sensitive information or returning partial data.
 *
 * The test generates a valid UUID format that is guaranteed not to exist in the system, then verifies the API responds with the appropriate 404 status code through an HttpError exception.
 *
 * 1. Generate a random UUID that does not correspond to any guest invitation
 * 2. Call GET /hrmTimeTrack/guests/{guestId} with the non-existent ID
 * 3. Verify the API throws an HttpError with status code 404
 */
export async function test_api_guest_invitation_not_found(
  connection: api.IConnection,
): Promise<void> {
  const guestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "non-existent guest invitation returns 404",
    404,
    async () =>
      await api.functional.hrmTimeTrack.guests.at(connection, {
        guestId,
      }),
  );
}
