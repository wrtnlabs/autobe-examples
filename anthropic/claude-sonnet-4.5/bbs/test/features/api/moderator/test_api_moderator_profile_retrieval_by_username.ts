import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_profile_retrieval_by_username(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account and authenticate
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(10) + "A1!";

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        location: RandomGenerator.name(2),
        website_url: `https://${RandomGenerator.alphaNumeric(8)}.com`,
        profile_picture_url: `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`,
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(createdModerator);

  // Step 2: Retrieve the moderator profile by username
  const retrievedProfile: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorUsername: createdModerator.username,
    });

  typia.assert(retrievedProfile);

  // Step 3: Validate that the response contains complete profile information
  TestValidator.equals(
    "moderator ID matches",
    retrievedProfile.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "username matches",
    retrievedProfile.username,
    createdModerator.username,
  );
  TestValidator.equals(
    "email matches",
    retrievedProfile.email,
    createdModerator.email,
  );
  TestValidator.equals(
    "display_name matches",
    retrievedProfile.display_name,
    createdModerator.display_name,
  );
  TestValidator.equals(
    "bio matches",
    retrievedProfile.bio,
    createdModerator.bio,
  );
  TestValidator.equals(
    "location matches",
    retrievedProfile.location,
    createdModerator.location,
  );
  TestValidator.equals(
    "website_url matches",
    retrievedProfile.website_url,
    createdModerator.website_url,
  );
  TestValidator.equals(
    "profile_picture_url matches",
    retrievedProfile.profile_picture_url,
    createdModerator.profile_picture_url,
  );
  TestValidator.equals(
    "email_verified matches",
    retrievedProfile.email_verified,
    createdModerator.email_verified,
  );
  TestValidator.equals(
    "status matches",
    retrievedProfile.status,
    createdModerator.status,
  );
  TestValidator.equals(
    "moderation_permissions matches",
    retrievedProfile.moderation_permissions,
    createdModerator.moderation_permissions,
  );
  TestValidator.equals(
    "profile_visibility matches",
    retrievedProfile.profile_visibility,
    createdModerator.profile_visibility,
  );
  TestValidator.equals(
    "activity_visibility matches",
    retrievedProfile.activity_visibility,
    createdModerator.activity_visibility,
  );

  // Step 4: Verify timestamps are present and in correct format
  TestValidator.predicate(
    "created_at is present",
    retrievedProfile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrievedProfile.updated_at !== undefined,
  );

  // Step 5: Validate that password_hash is never exposed in responses
  TestValidator.predicate(
    "password_hash should not be accessible in response",
    !("password_hash" in (retrievedProfile as any)) ||
      (retrievedProfile as any).password_hash === undefined,
  );
}
