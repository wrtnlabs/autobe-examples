import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test the complete workflow of a moderator deleting their own account.
 *
 * This test validates the successful deletion of a moderator account including
 * all associated data such as authentication sessions and community moderator
 * assignments. The test verifies that after deletion, the moderator's profile
 * information is marked as deleted with a deleted_at timestamp set, while
 * preserving moderation history for audit purposes.
 *
 * Test Steps:
 *
 * 1. Create a new moderator account through registration
 * 2. Verify the moderator is successfully created and authenticated
 * 3. The moderator deletes their own account using their username
 * 4. Verify the deletion response contains proper deleted_at timestamp
 * 5. Validate all required fields in the deletion response
 */
export async function test_api_moderator_account_deletion_by_self(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account for deletion testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorNickname = RandomGenerator.name();

  const registrationData = {
    email: moderatorEmail,
    password: moderatorPassword,
    nickname: moderatorNickname,
    ip: "127.0.0.1",
    href: "https://reddit-community.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://reddit-community.example.com" satisfies string &
      tags.Format<"uri">,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  // Step 2: Register the moderator and obtain authentication
  const authorizedModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate the registered moderator data
  typia.assert(authorizedModerator);
  TestValidator.equals(
    "registered email matches input",
    authorizedModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "registered nickname matches input",
    authorizedModerator.nickname,
    moderatorNickname,
  );

  // Step 4: Delete the moderator's own account
  const deletedModerator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.moderator.moderators.erase(
      connection,
      {
        username: authorizedModerator.username,
      },
    );

  // Step 5: Validate the deletion response
  typia.assert(deletedModerator);

  // Verify the deleted moderator ID matches the original
  TestValidator.equals(
    "deleted moderator ID matches created moderator",
    deletedModerator.id,
    authorizedModerator.id,
  );

  // Verify the deleted moderator username matches
  TestValidator.equals(
    "deleted moderator username matches",
    deletedModerator.username,
    authorizedModerator.username,
  );

  // Verify the deleted moderator email matches
  TestValidator.equals(
    "deleted moderator email matches",
    deletedModerator.email,
    authorizedModerator.email,
  );

  // Verify deleted_at timestamp is set (soft deletion)
  TestValidator.predicate(
    "deleted_at timestamp is set after deletion",
    deletedModerator.deleted_at !== null &&
      deletedModerator.deleted_at !== undefined,
  );
}
