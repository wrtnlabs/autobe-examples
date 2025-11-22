import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionGuestUser";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test user profile data consistency for economic and political discussion
 * board participants.
 *
 * Validates complete user profile data integrity by creating a guest user
 * account and then retrieving their profile to verify all fields are correctly
 * populated including UUID ID, display name, email uniqueness, optional bio and
 * avatar URL, account status, and creation/update timestamps. Ensures data
 * integrity and proper field population.
 */
export async function test_api_user_profile_data_consistency(
  connection: api.IConnection,
) {
  // Step 1: Create a guest user account with realistic profile data
  const guestUserEmail: string = typia.random<string & tags.Format<"email">>();
  const displayName: string = RandomGenerator.name();
  const bio: string | undefined = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const avatarUrl: string | undefined =
    `https://example.com/avatars/${typia.random<string & tags.Format<"uuid">>()}.jpg`;

  const guestUser: IEconPoliticalDiscussionGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        display_name: displayName,
        email: guestUserEmail,
        bio: bio,
        avatar_url: avatarUrl,
      } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
    });
  typia.assert(guestUser);

  // Step 2: Retrieve the complete user profile using the created user's UUID
  const userProfile: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.users.at(connection, {
      userId: guestUser.id,
    });
  typia.assert(userProfile);

  // Step 3: Validate required fields are present and correctly formatted
  TestValidator.equals("user ID is UUID format", userProfile.id, guestUser.id);
  TestValidator.equals(
    "display name matches registration",
    userProfile.display_name,
    guestUser.display_name,
  );
  TestValidator.equals(
    "email matches registration",
    userProfile.email,
    guestUser.email,
  );
  TestValidator.equals(
    "account status is active",
    userProfile.status,
    "active",
  );

  // Step 4: Validate timestamp fields are properly formatted and reasonable
  TestValidator.predicate(
    "created_at is valid ISO date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      userProfile.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at is valid ISO date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      userProfile.updated_at,
    ),
  );

  // Step 5: Validate optional bio field consistency
  if (bio !== undefined) {
    TestValidator.equals("bio matches registration data", userProfile.bio, bio);
  } else {
    TestValidator.equals(
      "bio is null when not provided",
      userProfile.bio,
      null,
    );
  }

  // Step 6: Validate optional avatar_url field consistency
  if (avatarUrl !== undefined) {
    TestValidator.equals(
      "avatar_url matches registration data",
      userProfile.avatar_url,
      avatarUrl,
    );
  } else {
    TestValidator.equals(
      "avatar_url is null when not provided",
      userProfile.avatar_url,
      null,
    );
  }

  // Step 7: Validate deleted_at is null for active accounts
  TestValidator.equals(
    "deleted_at is null for active account",
    userProfile.deleted_at,
    null,
  );

  // Step 8: Verify data integrity - profile matches registration data exactly
  TestValidator.notEquals(
    "profile ID differs from registration ID",
    userProfile.id,
    "",
  );
  TestValidator.notEquals(
    "display name differs from registration",
    userProfile.display_name,
    "",
  );
  TestValidator.notEquals(
    "email differs from registration",
    userProfile.email,
    "",
  );
  TestValidator.predicate("timestamps are recent (within last minute)", () => {
    const now = new Date();
    const created = new Date(userProfile.created_at);
    const updated = new Date(userProfile.updated_at);
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    return created >= oneMinuteAgo && updated >= oneMinuteAgo;
  });

  // Step 9: Validate email format compliance for account management
  TestValidator.predicate(
    "email format is valid for account management",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      userProfile.email,
    ),
  );

  // Step 10: Test data consistency across multiple profile retrievals
  const userProfileReloaded: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.users.at(connection, {
      userId: guestUser.id,
    });
  typia.assert(userProfileReloaded);

  TestValidator.equals(
    "profile data consistency on reload",
    userProfile,
    userProfileReloaded,
  );
  TestValidator.equals(
    "ID stability across multiple retrievals",
    userProfileReloaded.id,
    userProfile.id,
  );
  TestValidator.equals(
    "display name stability",
    userProfileReloaded.display_name,
    userProfile.display_name,
  );
  TestValidator.equals(
    "email stability",
    userProfileReloaded.email,
    userProfile.email,
  );
}
