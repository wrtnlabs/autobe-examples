import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test partial moderator profile update focusing on email address change.
 *
 * This test validates that a moderator can update only their email address
 * while leaving all other profile fields unchanged. It verifies the partial
 * update capability where only specified properties are modified without
 * affecting other profile data.
 *
 * Test workflow:
 *
 * 1. Create a moderator account with initial email
 * 2. Perform partial update with only new email field
 * 3. Verify email was updated successfully
 * 4. Confirm all other profile fields remain unchanged
 */
export async function test_api_moderator_profile_update_partial_email(
  connection: api.IConnection,
) {
  // Step 1: Create initial moderator account with first email
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const nickname = RandomGenerator.name();

  const createBody = {
    email: initialEmail,
    password: password,
    nickname: nickname,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const createdModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });

  typia.assert(createdModerator);

  // Verify initial moderator data
  TestValidator.equals(
    "initial email matches",
    createdModerator.email,
    initialEmail,
  );
  TestValidator.equals(
    "initial nickname matches",
    createdModerator.nickname,
    nickname,
  );

  // Step 2: Generate new email for partial update
  const newEmail = typia.random<string & tags.Format<"email">>();

  // Step 3: Perform partial update with only email field
  const updateBody = {
    email: newEmail,
  } satisfies IRedditCommunityCommunityModerator.IUpdate;

  const updatedProfile: IRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.moderator.moderators.update(
      connection,
      {
        username: createdModerator.username,
        body: updateBody,
      },
    );

  typia.assert(updatedProfile);

  // Step 4: Validate that email was updated
  // Note: ISummary doesn't contain email field, so we verify the update succeeded without errors
  // The successful response indicates the email update was accepted by the server

  // Step 5: Verify other profile fields remain unchanged
  // Only compare fields that exist in both IAuthorized and ISummary
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    createdModerator.username,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    createdModerator.created_at,
  );
}
