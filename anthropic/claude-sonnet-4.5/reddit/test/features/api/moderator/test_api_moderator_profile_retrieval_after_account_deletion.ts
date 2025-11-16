import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test attempting to retrieve a moderator profile after the account has been
 * deleted.
 *
 * This scenario validates that deleted moderator accounts are properly handled
 * and that soft-deleted profiles return appropriate responses. The test creates
 * a moderator account, deletes it using the deletion endpoint, then attempts to
 * retrieve the profile.
 *
 * Process:
 *
 * 1. Create a new moderator account with valid registration data
 * 2. Verify the account creation was successful
 * 3. Delete the moderator account
 * 4. Attempt to retrieve the deleted moderator's profile
 * 5. Verify the response indicates deletion (either error or deleted_at timestamp)
 */
export async function test_api_moderator_profile_retrieval_after_account_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const createdModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });
  typia.assert(createdModerator);

  // Step 2: Verify the moderator was created successfully
  TestValidator.equals(
    "created moderator email matches registration",
    createdModerator.email,
    registrationData.email,
  );
  TestValidator.equals(
    "created moderator nickname matches registration",
    createdModerator.nickname,
    registrationData.nickname,
  );

  // Store the username for later retrieval
  const moderatorUsername = createdModerator.username;

  // Step 3: Delete the moderator account
  const deletedModerator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.moderator.moderators.erase(
      connection,
      {
        username: moderatorUsername,
      },
    );
  typia.assert(deletedModerator);

  // Verify the deleted response contains the correct username
  TestValidator.equals(
    "deleted moderator username matches",
    deletedModerator.username,
    moderatorUsername,
  );

  // Step 4: Attempt to retrieve the deleted moderator's profile
  const retrievedProfile: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.moderators.profile.at(connection, {
      username: moderatorUsername,
    });
  typia.assert(retrievedProfile);

  // Step 5: Verify the profile indicates deletion (soft delete with deleted_at timestamp)
  TestValidator.predicate(
    "retrieved profile has deleted_at timestamp set",
    retrievedProfile.deleted_at !== null &&
      retrievedProfile.deleted_at !== undefined,
  );

  // Verify the profile still contains the correct username
  TestValidator.equals(
    "retrieved profile username matches",
    retrievedProfile.username,
    moderatorUsername,
  );
}
