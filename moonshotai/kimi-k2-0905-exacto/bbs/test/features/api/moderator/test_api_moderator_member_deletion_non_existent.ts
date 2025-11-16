import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test deletion attempt of non-existent member account ID.
 *
 * Validates proper error handling when moderators attempt to delete member
 * records that don't exist in the system, ensuring robust validation and
 * appropriate error responses are provided.
 *
 * 1. Create a moderator account for authentication
 * 2. Generate a fake UUID for non-existent member
 * 3. Attempt to delete the non-existent member
 * 4. Verify appropriate error is thrown
 */
export async function test_api_moderator_member_deletion_non_existent(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(),
        email: moderatorEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        moderation_level: "admin",
      } satisfies IEconomicDiscussionModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate fake UUID for non-existent member
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to delete non-existent member
  await TestValidator.error(
    "should fail when trying to delete non-existent member",
    async () => {
      await api.functional.economicDiscussion.moderator.members.erase(
        connection,
        {
          memberId: nonExistentMemberId,
        },
      );
    },
  );
}
