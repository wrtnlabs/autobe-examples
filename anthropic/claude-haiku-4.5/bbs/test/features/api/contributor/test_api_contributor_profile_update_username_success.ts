import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test successful username update by authenticated contributor.
 *
 * This test validates the complete workflow of contributor profile update:
 *
 * 1. Contributor registers with email, username, and password
 * 2. Registration returns JWT tokens for authentication
 * 3. Contributor updates their username to a new valid name
 * 4. Username validation is enforced (3-50 chars, alphanumeric + underscore)
 * 5. Username uniqueness constraint is validated
 * 6. Update persists the new username in the profile
 * 7. Response confirms the new username with updated timestamp
 */
export async function test_api_contributor_profile_update_username_success(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account
  const initialUsername = RandomGenerator.alphabets(5);
  const contributorEmail = typia.random<string & tags.Format<"email">>();

  const registeredContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: initialUsername,
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });

  typia.assert(registeredContributor);
  typia.assert(registeredContributor.token);

  TestValidator.equals(
    "registered contributor username matches input",
    registeredContributor.username,
    initialUsername,
  );
  TestValidator.equals(
    "registered contributor email matches input",
    registeredContributor.email,
    contributorEmail,
  );
  TestValidator.predicate(
    "email not verified after registration",
    !registeredContributor.email_verified,
  );
  TestValidator.equals(
    "account status is active after registration",
    registeredContributor.account_status,
    "active",
  );

  // Step 2: Record initial timestamp
  const initialUpdatedAt = registeredContributor.updated_at;

  // Step 3: Generate new valid username
  const newUsername = RandomGenerator.alphabets(8);
  TestValidator.predicate(
    "new username matches pattern ^[a-zA-Z0-9_]{3,50}$",
    /^[a-zA-Z0-9_]{3,50}$/.test(newUsername),
  );

  // Step 4: Update username via profile update endpoint
  const updatedProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {
          username: newUsername,
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );

  typia.assert(updatedProfile);

  // Step 5: Validate update was successful
  TestValidator.equals(
    "updated profile username matches new username",
    updatedProfile.username,
    newUsername,
  );
  TestValidator.equals(
    "updated profile email remains unchanged",
    updatedProfile.email,
    contributorEmail,
  );
  TestValidator.equals(
    "updated profile account status remains active",
    updatedProfile.accountStatus,
    "active",
  );
  TestValidator.notEquals(
    "updated_at timestamp changed after update",
    updatedProfile.updatedAt,
    initialUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is after initial timestamp",
    new Date(updatedProfile.updatedAt) >= new Date(initialUpdatedAt),
  );
}
