import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test email verification attempt on an already verified account to validate
 * business logic.
 *
 * This test creates a new registered user account, verifies their email
 * address, then attempts to verify the same account again to ensure the system
 * properly handles already-verified accounts without duplicating verification
 * actions. The test validates that the platform either treats duplicate
 * verification as idempotent (returns success) or returns appropriate error
 * handling for accounts that are already verified.
 */
export async function test_api_email_verification_already_verified(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account
  const testUserData = {
    username:
      RandomGenerator.name(1).toLowerCase() + RandomGenerator.alphaNumeric(6),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    display_name: "Test User",
    bio: "Test bio for email verification testing",
    location: "Test City",
    href: "https://test.example.com/register",
    referrer: "https://test.example.com",
  };

  const createdUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: testUserData satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(createdUser);

  // Validate initial user state
  TestValidator.equals(
    "user account created successfully",
    createdUser.id.length > 0,
    true,
  );
  TestValidator.equals(
    "user has pending verification status",
    createdUser.businessStatus,
    "pending_verification",
  );
  TestValidator.equals(
    "user email is not initially verified",
    createdUser.emailVerified,
    false,
  );

  // Step 2: Generate a verification token and verify the email (simulating first-time verification)
  const verificationToken = typia.random<string>();
  const verifiedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.email.verify.verifyEmail(
      connection,
      {
        token: verificationToken,
      },
    );
  typia.assert(verifiedUser);

  // Validate first verification success
  TestValidator.equals(
    "verification token accepted for pending user",
    verifiedUser.id,
    createdUser.id,
  );
  TestValidator.equals(
    "user status changed to active after verification",
    verifiedUser.businessStatus,
    "active",
  );
  TestValidator.equals(
    "user email verified status is now true",
    verifiedUser.emailVerified,
    true,
  );
  TestValidator.equals(
    "email verified timestamp is set",
    verifiedUser.emailVerifiedAt !== undefined,
    true,
  );

  // Step 3: Attempt to verify the already-verified account again
  const secondVerificationToken = typia.random<string>();
  const secondVerificationResult: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.email.verify.verifyEmail(
      connection,
      {
        token: secondVerificationToken,
      },
    );
  typia.assert(secondVerificationResult);

  // Step 4: Validate the system's handling of already-verified account verification
  TestValidator.equals(
    "second verification call succeeded",
    secondVerificationResult.id,
    createdUser.id,
  );
  TestValidator.equals(
    "user status remains active after duplicate verification",
    secondVerificationResult.businessStatus,
    "active",
  );
  TestValidator.equals(
    "email remains verified after second verification",
    secondVerificationResult.emailVerified,
    true,
  );
  TestValidator.equals(
    "original verification timestamp is preserved",
    secondVerificationResult.emailVerifiedAt,
    verifiedUser.emailVerifiedAt,
  );
}
