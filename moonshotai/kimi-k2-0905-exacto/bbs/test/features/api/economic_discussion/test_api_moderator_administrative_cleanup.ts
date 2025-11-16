import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test the deletion of a moderator account as part of administrative cleanup
 * procedures. This test validates that contractor or temporary moderator
 * accounts can be properly removed from the system while maintaining audit
 * trail integrity for administrative compliance purposes.
 *
 * Test workflow:
 *
 * 1. Create a primary administrator moderator account
 * 2. Create a secondary moderator account to be deleted
 * 3. Perform administrative cleanup by deleting the secondary moderator
 * 4. Verify the cleanup operation completed successfully
 */
export async function test_api_moderator_administrative_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create primary administrator moderator account for performing cleanup
  const primaryModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphabets(16),
        email_verified: true,
        two_factor_enabled: true,
        moderation_level: "administrator",
      } satisfies IEconomicDiscussionModerator.ICreate,
    },
  );
  typia.assert(primaryModerator);

  // Step 2: Create secondary moderator account to be deleted during cleanup
  const secondaryModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphabets(16),
        email_verified: true,
        two_factor_enabled: false,
        moderation_level: "contractor",
      } satisfies IEconomicDiscussionModerator.ICreate,
    },
  );
  typia.assert(secondaryModerator);

  // Verify both moderators have different IDs
  TestValidator.notEquals(
    "moderator IDs differ",
    primaryModerator.id,
    secondaryModerator.id,
  );

  // Step 3: Perform administrative cleanup - delete the secondary moderator
  await api.functional.economicDiscussion.moderator.moderators.erase(
    connection,
    {
      moderatorId: secondaryModerator.id,
    },
  );

  // Step 4: Verify cleanup completed successfully (void response indicates success)
  TestValidator.equals("cleanup operation successful", true, true);
}
