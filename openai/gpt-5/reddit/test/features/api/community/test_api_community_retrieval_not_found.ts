import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Validate not-found behavior for unknown community IDs.
 *
 * Workflow:
 *
 * 1. Generate a random UUID not associated with any community.
 * 2. Invoke GET /communityPlatform/communities/{communityId}.
 * 3. Expect an error for real backends (not-found or access-denied style) so that
 *    the API does not leak details for non-existent/inaccessible communities.
 *
 * Note on simulate mode:
 *
 * - When connection.simulate === true, the SDK returns a random
 *   ICommunityPlatformCommunity for valid UUIDs instead of throwing. In that
 *   case, assert the returned structure via typia.assert and exit.
 */
export async function test_api_community_retrieval_not_found(
  connection: api.IConnection,
) {
  // 1) Prepare unknown community id
  const unknownId = typia.random<string & tags.Format<"uuid">>();

  // 2) Simulate-mode compatibility: SDK returns random data for valid UUID
  if (connection.simulate === true) {
    const output = await api.functional.communityPlatform.communities.at(
      connection,
      { communityId: unknownId },
    );
    typia.assert(output);
    return; // In simulate mode, not-found cannot be reproduced
  }

  // 3) Real backend: expect an error for an unknown id
  await TestValidator.error(
    "unknown community id should not be retrievable",
    async () => {
      await api.functional.communityPlatform.communities.at(connection, {
        communityId: unknownId,
      });
    },
  );
}
