import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that the updated_at timestamp is correctly refreshed when profile
 * updates occur.
 *
 * This test verifies audit trail functionality by checking that profile
 * modifications update the updated_at field while preserving the original
 * created_at timestamp.
 *
 * Test steps:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Capture initial created_at and updated_at timestamps
 * 3. Wait briefly to ensure time passes
 * 4. Perform a profile update operation
 * 5. Verify updated_at has changed to reflect modification time
 * 6. Verify created_at remains unchanged
 * 7. Ensure updated_at is later than created_at
 */
export async function test_api_moderator_profile_update_timestamp_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const username = RandomGenerator.alphaNumeric(12);
  const email =
    `${RandomGenerator.alphaNumeric(10)}@example.com` satisfies string &
      tags.Format<"email">;
  const password = "SecurePass123!";

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: username satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">,
        email: email,
        password: password satisfies string & tags.MinLength<8>,
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(createdModerator);

  // Step 2: Capture the initial timestamps
  const initialCreatedAt = createdModerator.created_at;
  const initialUpdatedAt = createdModerator.updated_at;

  // Step 3: Wait briefly to ensure time passes (1.5 seconds)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Step 4: Update the moderator's profile
  const updatedDisplayName = RandomGenerator.name(2);
  const updatedBio = RandomGenerator.paragraph({ sentences: 3 });

  const updatedModerator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: username,
        body: {
          display_name: updatedDisplayName satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<50>,
          bio: updatedBio satisfies string & tags.MaxLength<500>,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );

  typia.assert(updatedModerator);

  // Step 5: Verify that updated_at has changed
  TestValidator.notEquals(
    "updated_at should have changed after profile update",
    updatedModerator.updated_at,
    initialUpdatedAt,
  );

  // Step 6: Verify that created_at remains unchanged
  TestValidator.equals(
    "created_at should remain unchanged after profile update",
    updatedModerator.created_at,
    initialCreatedAt,
  );

  // Step 7: Ensure updated_at is later than created_at
  const createdAtTime = new Date(updatedModerator.created_at).getTime();
  const updatedAtTime = new Date(updatedModerator.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be later than created_at",
    updatedAtTime > createdAtTime,
  );

  // Additional verification: Check that the profile updates were applied
  TestValidator.equals(
    "display_name should be updated",
    updatedModerator.display_name,
    updatedDisplayName,
  );

  TestValidator.equals(
    "bio should be updated",
    updatedModerator.bio,
    updatedBio,
  );
}
