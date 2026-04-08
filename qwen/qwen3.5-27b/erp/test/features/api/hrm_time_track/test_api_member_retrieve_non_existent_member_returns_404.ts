import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that attempting to retrieve a non-existent member returns 404 Not Found.
 *
 * Validates the error handling behavior when querying for a member that doesn't exist in the system. The test generates a valid UUID format string that doesn't correspond to any existing member record and verifies the API responds with appropriate error status.
 *
 * 1. Generate a valid UUID format string for a non-existent member ID.
 * 2. Create an isolated connection for the API call.
 * 3. Attempt to retrieve the non-existent member via GET endpoint.
 * 4. Verify the API throws HttpError with 404 status code.
 */
export async function test_api_member_retrieve_non_existent_member_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid UUID for a non-existent member
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create isolated connection for the API call
  const memberConnection: api.IConnection = { host: connection.host };
  // 3. Attempt to retrieve non-existent member and validate 404 error
  await TestValidator.httpError(
    "retrieve non-existent member returns 404",
    404,
    async () =>
      await api.functional.hrmTimeTrack.members.at(memberConnection, {
        memberId: nonExistentMemberId,
      }),
  );
}
