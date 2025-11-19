import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test successful profile retrieval for a newly registered contributor.
 *
 * This test validates that a contributor account created through the join
 * (registration) endpoint can immediately retrieve their complete profile
 * information. The test verifies that all profile fields are returned
 * correctly, including email, username, account status, email verification
 * state, and timestamp metadata. The retrieved profile data should match the
 * information provided during account registration.
 *
 * Steps:
 *
 * 1. Register a new contributor account with email, username, and password
 * 2. Retrieve the authenticated contributor's profile information
 * 3. Validate that all profile fields are present and correctly populated
 * 4. Verify that profile data matches the registration data
 * 5. Confirm account status is 'active' and email_verified is false initially
 */
export async function test_api_contributor_profile_retrieval_after_registration(
  connection: api.IConnection,
) {
  // Generate test data for contributor registration
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "TestPassword123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Step 1: Register a new contributor account
  const registeredContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(registeredContributor);

  // Verify registration response contains required fields
  TestValidator.equals(
    "registered contributor email matches input",
    registeredContributor.email,
    email,
  );
  TestValidator.equals(
    "registered contributor username matches input",
    registeredContributor.username,
    username,
  );
  TestValidator.equals(
    "registered contributor account status is active",
    registeredContributor.account_status,
    "active",
  );
  TestValidator.predicate(
    "email verified is false after registration",
    registeredContributor.email_verified === false,
  );

  // Step 2: Retrieve the authenticated contributor's profile
  const profile: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(profile);

  // Step 3 & 4: Validate profile fields and match with registration data
  TestValidator.equals(
    "profile email matches registered email",
    profile.email,
    email,
  );
  TestValidator.equals(
    "profile username matches registered username",
    profile.username,
    username,
  );
  TestValidator.equals(
    "profile email matches registered contributor email",
    profile.email,
    registeredContributor.email,
  );
  TestValidator.equals(
    "profile username matches registered contributor username",
    profile.username,
    registeredContributor.username,
  );

  // Step 5: Verify account status and email verification state
  TestValidator.equals(
    "profile account status is active",
    profile.accountStatus,
    "active",
  );
  TestValidator.predicate(
    "profile email verified is false initially",
    profile.emailVerified === false,
  );

  // Validate all profile timestamp fields exist
  TestValidator.predicate(
    "profile has valid created_at timestamp",
    typia.is<string & tags.Format<"date-time">>(profile.createdAt),
  );
  TestValidator.predicate(
    "profile has valid updated_at timestamp",
    typia.is<string & tags.Format<"date-time">>(profile.updatedAt),
  );

  // Verify profile ID is a valid UUID
  TestValidator.predicate(
    "profile ID is valid UUID format",
    typia.is<string & tags.Format<"uuid">>(profile.id),
  );

  // Verify profile contains all expected fields
  TestValidator.predicate(
    "profile has all required fields",
    profile.id !== undefined &&
      profile.email !== undefined &&
      profile.username !== undefined &&
      profile.emailVerified !== undefined &&
      profile.accountStatus !== undefined &&
      profile.createdAt !== undefined &&
      profile.updatedAt !== undefined,
  );
}
