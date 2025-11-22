import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_email_verification_business_status_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account
  const username = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;

  const userCreateData = {
    username: username satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<20>,
    email: email satisfies string & tags.Format<"email">,
    password: "SecurePass123!",
    display_name: RandomGenerator.name(),
    bio: "Test user for email verification testing",
    location: "Seoul, South Korea",
    website_url: `https://example.com/${username}`,
    avatar_url: "https://example.com/avatar.jpg",
    href: "https://reddit-platform.example.com/register",
    referrer: "https://reddit-platform.example.com/landing",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  const newUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userCreateData,
    });
  typia.assert(newUser);

  // Step 2: Validate initial pending verification status
  TestValidator.equals(
    "new user should have pending verification status",
    newUser.businessStatus,
    "pending_verification",
  );
  TestValidator.equals(
    "new user should not be email verified",
    newUser.emailVerified,
    false,
  );
  TestValidator.equals(
    "username should match input",
    newUser.username,
    username,
  );
  TestValidator.equals("email should match input", newUser.email, email);

  // Step 3: Generate email verification token
  // In real scenario, this would come from email, but for testing we simulate it
  const verificationToken = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Perform email verification
  const verifiedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.email.verify.verifyEmail(
      connection,
      {
        token: verificationToken,
      },
    );
  typia.assert(verifiedUser);

  // Step 5: Validate business status transition to active
  TestValidator.equals(
    "verified user should have active business status",
    verifiedUser.businessStatus,
    "active",
  );
  TestValidator.equals(
    "user should be email verified after verification",
    verifiedUser.emailVerified,
    true,
  );
  TestValidator.equals(
    "username should remain consistent",
    verifiedUser.username,
    username,
  );
  TestValidator.equals(
    "email should remain consistent",
    verifiedUser.email,
    email,
  );

  // Step 6: Validate that emailVerifiedAt timestamp is set
  TestValidator.predicate(
    "email verification timestamp should be set",
    verifiedUser.emailVerifiedAt !== null &&
      verifiedUser.emailVerifiedAt !== undefined,
  );

  // Step 7: Validate other account fields remain intact
  TestValidator.equals(
    "display name should be preserved",
    verifiedUser.displayName,
    userCreateData.display_name || username,
  );
  TestValidator.equals(
    "account status should be active",
    verifiedUser.accountStatus,
    "active",
  );
  TestValidator.predicate(
    "karma score should be initialized",
    verifiedUser.karmaScore === 0,
  );
  TestValidator.predicate(
    "login count should be initialized",
    verifiedUser.loginCount === 0,
  );
}
