import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_moderator_profile_moderation_tier_full_permissions(
  connection: api.IConnection,
) {
  // 1. Create a new moderator account via registration with proper password meeting complexity requirements
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(4) + // lowercase
    RandomGenerator.alphabets(4).toUpperCase() + // uppercase
    typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>
      >()
      .toString() + // number
    "!@#$%".charAt(Math.floor(Math.random() * 6)); // special character
  const moderatorUsername =
    RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(3);

  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(authorizedModerator);

  // 2. Retrieve the moderator's profile to verify moderation tier and account initialization
  const moderatorProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(moderatorProfile);

  // 3. Validate that the moderator has 'full' moderation tier (unrestricted access to all moderation features)
  TestValidator.equals(
    "moderator should have full moderation tier",
    moderatorProfile.moderationTier,
    "full",
  );

  // 4. Verify that the profile data matches the created moderator
  TestValidator.equals(
    "profile email matches created moderator email",
    moderatorProfile.email,
    moderatorEmail,
  );

  TestValidator.equals(
    "profile username matches created moderator username",
    moderatorProfile.username,
    moderatorUsername,
  );

  // 5. Verify account status is active upon creation
  TestValidator.equals(
    "moderator account status should be active",
    moderatorProfile.accountStatus,
    "active",
  );

  // 6. Verify email is not yet verified (email verification required before full access)
  TestValidator.equals(
    "email should not be verified initially",
    moderatorProfile.emailVerified,
    false,
  );

  // 7. Verify moderator ID is a valid UUID
  TestValidator.predicate(
    "moderator ID should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderatorProfile.id,
    ),
  );

  // 8. Verify created_at timestamp is in ISO 8601 format
  TestValidator.predicate(
    "created_at should be valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(moderatorProfile.createdAt),
  );
}
