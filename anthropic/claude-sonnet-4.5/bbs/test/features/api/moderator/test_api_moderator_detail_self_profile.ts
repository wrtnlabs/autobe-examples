import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test a moderator retrieving their own profile information.
 *
 * This test validates the common use case where a moderator views their own
 * account details for profile management purposes. The test ensures that
 * moderators can successfully access their own information and that all profile
 * fields are accurately returned.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Use the authenticated moderator's ID to retrieve their profile
 * 3. Validate that all profile fields match the created moderator
 * 4. Verify timestamps and account information are correctly returned
 */
export async function test_api_moderator_detail_self_profile(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 2: Retrieve the moderator's own profile using their ID
  const retrievedProfile: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorId: createdModerator.id,
    });
  typia.assert(retrievedProfile);

  // Step 3: Validate that the retrieved profile matches the created moderator
  TestValidator.equals(
    "moderator ID matches",
    retrievedProfile.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "moderator email matches",
    retrievedProfile.email,
    createdModerator.email,
  );

  TestValidator.equals(
    "moderator username matches",
    retrievedProfile.username,
    createdModerator.username,
  );

  TestValidator.equals(
    "created timestamp matches",
    retrievedProfile.created_at,
    createdModerator.created_at,
  );

  TestValidator.equals(
    "updated timestamp matches",
    retrievedProfile.updated_at,
    createdModerator.updated_at,
  );
}
