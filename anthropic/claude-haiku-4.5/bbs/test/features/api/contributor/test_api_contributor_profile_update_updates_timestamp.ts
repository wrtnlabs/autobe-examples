import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that updated_at timestamp is automatically recorded when a contributor
 * updates their profile.
 *
 * Verifies the timestamp behavior in the contributor profile update workflow:
 *
 * 1. Register a new contributor account and capture the initial created_at and
 *    updated_at timestamps
 * 2. Wait briefly to ensure time difference between creation and update
 * 3. Update the contributor's profile information (email address)
 * 4. Retrieve the updated profile
 * 5. Verify that created_at timestamp remains unchanged (immutable)
 * 6. Verify that updated_at timestamp has been updated to reflect the modification
 *    time
 * 7. Confirm both timestamps are in valid ISO 8601 format
 *
 * This test ensures the API correctly manages account lifecycle timestamps when
 * profile modifications occur.
 */
export async function test_api_contributor_profile_update_updates_timestamp(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const createdContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(createdContributor);

  // Capture initial timestamps from registration
  const initialCreatedAt = createdContributor.created_at;
  const initialUpdatedAt = createdContributor.updated_at;

  // Verify both timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "initial created_at is valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(initialCreatedAt),
  );
  TestValidator.predicate(
    "initial updated_at is valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(initialUpdatedAt),
  );

  // Step 2: Wait briefly to ensure time difference between creation and update
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Update the contributor's profile with new email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {
          email: newEmail,
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(updatedProfile);

  // Step 4: Verify the profile update was applied
  TestValidator.equals(
    "updated profile email matches new email",
    updatedProfile.email,
    newEmail,
  );

  // Step 5: Verify created_at timestamp remains unchanged (immutable)
  TestValidator.equals(
    "created_at timestamp remains unchanged after profile update",
    updatedProfile.createdAt,
    initialCreatedAt,
  );

  // Step 6: Verify updated_at timestamp has been updated
  TestValidator.notEquals(
    "updated_at timestamp is different after profile update",
    updatedProfile.updatedAt,
    initialUpdatedAt,
  );

  // Step 7: Verify updated_at is newer than created_at
  const createdTime = new Date(updatedProfile.createdAt).getTime();
  const updatedTime = new Date(updatedProfile.updatedAt).getTime();
  TestValidator.predicate(
    "updated_at timestamp is after created_at timestamp",
    updatedTime > createdTime,
  );

  // Step 8: Verify the updated timestamp is valid ISO 8601 format
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedProfile.updatedAt),
  );
}
