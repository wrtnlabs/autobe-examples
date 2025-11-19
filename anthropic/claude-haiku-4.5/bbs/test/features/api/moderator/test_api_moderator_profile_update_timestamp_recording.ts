import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test automatic updated_at timestamp recording for moderator profile updates.
 *
 * This test validates that when a moderator updates their profile information,
 * the system correctly manages timestamp fields. The created_at timestamp
 * should remain constant from initial creation, while updated_at should be
 * automatically updated to reflect the modification time. Both timestamps must
 * be in valid ISO 8601 date-time format.
 *
 * Steps:
 *
 * 1. Create a new moderator account via registration endpoint
 * 2. Record the initial created_at and updated_at timestamps from response
 * 3. Wait a brief moment to ensure time difference is detectable
 * 4. Update the moderator's profile with new email and/or username
 * 5. Retrieve the updated profile to verify timestamp changes
 * 6. Validate that created_at remains unchanged
 * 7. Validate that updated_at has been updated to a later time
 * 8. Verify both timestamps follow ISO 8601 format
 */
export async function test_api_moderator_profile_update_timestamp_recording(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphabets(8);

  const createResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(createResponse);

  // Step 2: Record initial timestamps from moderator creation response
  const initialCreatedAt = createResponse.created_at;
  const initialUpdatedAt = createResponse.updated_at;

  // Step 3: Wait to ensure time difference is detectable
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 4: Update the moderator's profile
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newUsername = RandomGenerator.alphabets(10);

  const updateResponse: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: newEmail,
        username: newUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(updateResponse);

  // Step 5: Extract timestamps from update response (camelCase format)
  const updatedCreatedAt = updateResponse.createdAt;
  const updatedUpdatedAt = updateResponse.updatedAt;

  // Step 6: Validate that created_at remains unchanged
  TestValidator.equals(
    "created_at timestamp should remain constant after profile update",
    initialCreatedAt,
    updatedCreatedAt,
  );

  // Step 7: Validate that updated_at has been updated to a strictly later time
  const initialUpdateTime = new Date(initialUpdatedAt).getTime();
  const finalUpdateTime = new Date(updatedUpdatedAt).getTime();
  TestValidator.predicate(
    "updated_at timestamp should be strictly greater after profile modification",
    finalUpdateTime > initialUpdateTime,
  );

  // Step 8: Verify both timestamps follow ISO 8601 format
  TestValidator.predicate(
    "created_at should be in ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedCreatedAt),
  );

  TestValidator.predicate(
    "updated_at should be in ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedUpdatedAt),
  );

  // Step 9: Verify profile data was updated correctly
  TestValidator.equals(
    "email should be updated to new value",
    newEmail,
    updateResponse.email,
  );

  TestValidator.equals(
    "username should be updated to new value",
    newUsername,
    updateResponse.username,
  );
}
