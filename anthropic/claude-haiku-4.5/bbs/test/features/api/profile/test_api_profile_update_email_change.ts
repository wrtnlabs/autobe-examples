import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test successful email address update for authenticated user.
 *
 * This test validates that an authenticated user can successfully update their
 * email address through the PUT /my/profile endpoint. The test verifies that:
 *
 * 1. The email change is accepted with a valid, previously-unused email
 * 2. The system updates the email field correctly
 * 3. The updated_at timestamp is recorded when the profile is updated
 * 4. The response returns the complete updated profile with the new email
 *
 * This is an essential test for profile management functionality, ensuring that
 * users can modify their account information and that changes are properly
 * persisted and reflected in the API response.
 */
export async function test_api_profile_update_email_change(
  connection: api.IConnection,
) {
  // Generate a new email address for the update
  const newEmail = typia.random<string & tags.Format<"email">>();

  // Update the authenticated user's profile with the new email
  const updatedProfile: IDiscussionBoardUser =
    await api.functional.my.profile.update(connection, {
      body: {
        email: newEmail,
      } satisfies IDiscussionBoardUser.IUpdate,
    });

  // Validate that the response contains a valid user profile
  typia.assert(updatedProfile);

  // Verify that the email was updated correctly
  TestValidator.equals(
    "updated profile email matches the new email",
    updatedProfile.email,
    newEmail,
  );

  // Verify that the updated_at timestamp exists and reflects the update
  TestValidator.predicate(
    "updated_at timestamp is present and is a valid date-time",
    () => {
      const updatedAt = new Date(updatedProfile.updatedAt);
      return !isNaN(updatedAt.getTime());
    },
  );
}
