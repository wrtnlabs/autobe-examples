import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test vote retrieval error handling for administrators attempting to access
 * non-existent vote records. This scenario validates that the system properly
 * handles invalid vote IDs by returning appropriate error responses. It ensures
 * that administrators receive clear error messages when attempting to retrieve
 * votes that don't exist or have been deleted, maintaining platform security
 * and data integrity.
 */
export async function test_api_admin_vote_retrieval_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate a random UUID that doesn't correspond to any existing vote
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve the non-existent vote and validate error response
  await TestValidator.error(
    "retrieving non-existent vote should fail",
    async () => {
      await api.functional.communityPlatform.admin.votes.at(connection, {
        voteId: nonExistentVoteId,
      });
    },
  );
}
