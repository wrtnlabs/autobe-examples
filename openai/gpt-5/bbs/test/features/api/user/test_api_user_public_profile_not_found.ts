import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";

/**
 * Validate that requesting a non-existent public user profile results in an
 * error.
 *
 * Business context
 *
 * - Public endpoint to fetch a user's public-facing profile by UUID.
 * - Service must not leak existence of private data; non-existent or inactive
 *   users should not be retrievable.
 *
 * Steps
 *
 * 1. Generate a random UUID not expected to match any active user.
 * 2. If running in simulation mode, call the endpoint and assert the response
 *    type, then exit (simulation returns mock data).
 * 3. Otherwise, call the endpoint and assert that an error is thrown (do not
 *    assert specific HTTP status codes).
 */
export async function test_api_user_public_profile_not_found(
  connection: api.IConnection,
) {
  // 1) Generate a random UUID for a non-existent user
  const unknownUserId = typia.random<string & tags.Format<"uuid">>();

  // 2) Simulation mode handling: simulator returns random data for any input
  if (connection.simulate === true) {
    const simulated: IEconDiscussUser =
      await api.functional.econDiscuss.users.at(connection, {
        userId: unknownUserId,
      });
    typia.assert(simulated);
    return; // avoid false negatives under simulator
  }

  // 3) Real backend: expect an error for unknown/inactive user
  await TestValidator.error(
    "non-existent or inactive user should not be retrievable",
    async () => {
      await api.functional.econDiscuss.users.at(connection, {
        userId: unknownUserId,
      });
    },
  );
}
