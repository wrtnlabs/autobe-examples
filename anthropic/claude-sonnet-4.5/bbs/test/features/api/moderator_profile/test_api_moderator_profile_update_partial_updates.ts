import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Tests that moderators can perform partial profile updates without affecting
 * unchanged fields.
 *
 * This test validates the flexibility of the profile update operation by
 * demonstrating that moderators can update individual fields without submitting
 * their entire profile. It creates a moderator with complete profile data,
 * updates only the bio field, verifies that other fields remain unchanged, then
 * updates a different field to confirm selective updates work for any field.
 *
 * Test workflow:
 *
 * 1. Create moderator account with complete profile
 * 2. Update only bio field
 * 3. Verify bio changed while other fields unchanged
 * 4. Update only display_name field
 * 5. Verify display_name changed while bio and other fields remain from previous
 *    states
 */
export async function test_api_moderator_profile_update_partial_updates(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with complete profile data
  const initialDisplayName = RandomGenerator.name(2);
  const initialBio = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const initialLocation = RandomGenerator.name(2);
  const initialWebsiteUrl = `https://${RandomGenerator.alphabets(8)}.com`;
  const initialProfilePictureUrl = `https://example.com/avatars/${RandomGenerator.alphaNumeric(12)}.png`;

  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorEmail = `${RandomGenerator.alphabets(10)}@example.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: initialDisplayName,
        bio: initialBio,
        location: initialLocation,
        website_url: initialWebsiteUrl,
        profile_picture_url: initialProfilePictureUrl,
        href: "https://test.example.com/moderator/join",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );

  typia.assert(createdModerator);

  // Verify initial profile creation
  TestValidator.equals(
    "initial display_name matches",
    createdModerator.display_name,
    initialDisplayName,
  );
  TestValidator.equals("initial bio matches", createdModerator.bio, initialBio);
  TestValidator.equals(
    "initial location matches",
    createdModerator.location,
    initialLocation,
  );
  TestValidator.equals(
    "initial website_url matches",
    createdModerator.website_url,
    initialWebsiteUrl,
  );
  TestValidator.equals(
    "initial profile_picture_url matches",
    createdModerator.profile_picture_url,
    initialProfilePictureUrl,
  );

  // Step 2: Perform partial update - modify only bio field
  const updatedBio = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 10,
  });

  const firstUpdate =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: createdModerator.username,
        body: {
          bio: updatedBio,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );

  typia.assert(firstUpdate);

  // Step 3: Verify bio changed while other fields remain unchanged
  TestValidator.equals("bio was updated", firstUpdate.bio, updatedBio);
  TestValidator.equals(
    "display_name unchanged after bio update",
    firstUpdate.display_name,
    initialDisplayName,
  );
  TestValidator.equals(
    "location unchanged after bio update",
    firstUpdate.location,
    initialLocation,
  );
  TestValidator.equals(
    "website_url unchanged after bio update",
    firstUpdate.website_url,
    initialWebsiteUrl,
  );
  TestValidator.equals(
    "profile_picture_url unchanged after bio update",
    firstUpdate.profile_picture_url,
    initialProfilePictureUrl,
  );

  // Step 4: Perform second partial update - modify only display_name field
  const updatedDisplayName = RandomGenerator.name(3);

  const secondUpdate =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: createdModerator.username,
        body: {
          display_name: updatedDisplayName,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );

  typia.assert(secondUpdate);

  // Step 5: Verify display_name changed while bio and other fields remain from previous states
  TestValidator.equals(
    "display_name was updated",
    secondUpdate.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "bio remains from first update",
    secondUpdate.bio,
    updatedBio,
  );
  TestValidator.equals(
    "location still unchanged",
    secondUpdate.location,
    initialLocation,
  );
  TestValidator.equals(
    "website_url still unchanged",
    secondUpdate.website_url,
    initialWebsiteUrl,
  );
  TestValidator.equals(
    "profile_picture_url still unchanged",
    secondUpdate.profile_picture_url,
    initialProfilePictureUrl,
  );
}
