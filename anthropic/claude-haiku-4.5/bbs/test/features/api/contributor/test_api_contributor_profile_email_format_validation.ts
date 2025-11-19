import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that profile response includes email address in valid RFC 5321 format.
 *
 * This test validates the contributor profile email format by:
 *
 * 1. Registering a new contributor with a valid email address
 * 2. Retrieving the authenticated contributor's profile
 * 3. Verifying the email field matches the registration email
 * 4. Confirming the email format is valid (RFC 5321 compliant)
 * 5. Testing email uniqueness by attempting to register duplicate email
 */
export async function test_api_contributor_profile_email_format_validation(
  connection: api.IConnection,
) {
  // Step 1: Generate test data with valid email format
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "TestPassword123!";
  const href = "https://example.com/register";
  const referrer = "https://example.com";

  // Step 2: Register contributor with valid email
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

  // Verify registration response contains email
  TestValidator.equals(
    "registered contributor email matches input",
    registeredContributor.email,
    email,
  );

  // Step 3: Retrieve contributor profile using authenticated connection
  const profile: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(profile);

  // Step 4: Validate email format in profile
  TestValidator.equals(
    "profile email matches registered email",
    profile.email,
    email,
  );

  // Verify email format is valid (RFC 5321)
  TestValidator.predicate(
    "email contains @ symbol",
    profile.email.includes("@"),
  );

  TestValidator.predicate(
    "email format is valid",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      profile.email,
    ),
  );

  // Step 5: Verify profile contains other expected attributes
  TestValidator.equals(
    "profile username matches registered username",
    profile.username,
    username,
  );

  TestValidator.predicate(
    "profile has valid account status",
    ["active", "suspended", "restricted", "deleted"].includes(
      profile.accountStatus,
    ),
  );

  TestValidator.predicate(
    "profile email verified is boolean",
    typeof profile.emailVerified === "boolean",
  );

  TestValidator.predicate(
    "profile created timestamp is valid date format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.createdAt),
  );

  // Step 6: Test email uniqueness - attempting to register with same email should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email,
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<50> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          password: "AnotherPassword123!",
          href,
          referrer,
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );
}
