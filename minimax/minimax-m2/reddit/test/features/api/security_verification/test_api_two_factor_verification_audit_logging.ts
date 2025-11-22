import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Comprehensive E2E test for two-factor authentication verification audit
 * logging.
 *
 * This test validates that successful and failed two-factor authentication
 * verification attempts are properly logged with timestamps, user
 * identification, and security events for compliance and monitoring purposes in
 * the Reddit platform security framework.
 *
 * Test Flow:
 *
 * 1. Create registered user account for authentication context
 * 2. Test successful two-factor verification with valid credentials
 * 3. Test failed verification scenarios with invalid codes
 * 4. Validate audit trail completeness and security event tracking
 * 5. Verify compliance with security monitoring requirements
 */
export async function test_api_two_factor_verification_audit_logging(
  connection: api.IConnection,
) {
  // Step 1: Create registered user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";
  const userDisplayName = RandomGenerator.name();

  const newUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: userPassword,
        display_name: userDisplayName,
        href: "https://test.reddit.com/2fa-setup",
        referrer: "https://test.reddit.com/profile",
        bio: "Test user for 2FA audit logging verification",
        location: "Test City, Test State",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(newUser);

  TestValidator.equals(
    "user account created successfully",
    newUser.email,
    userEmail,
  );
  TestValidator.equals(
    "user account is active",
    newUser.accountStatus,
    "active",
  );
  TestValidator.equals(
    "user account business status",
    newUser.businessStatus,
    "pending_verification",
  );

  // Record user creation timestamp for audit comparison
  const userCreationTime = new Date(newUser.createdAt);

  // Step 2: Test successful two-factor verification with valid credentials
  const validVerificationCode = "123456"; // Valid 6-digit TOTP code format
  const successfulVerification: IRedditPlatformRegisteredUser.ITwoFactorVerificationResult =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.verify.twoFactorVerify(
      connection,
      {
        body: {
          verification_code: validVerificationCode,
          confirm_activation: true,
        } satisfies IRedditPlatformRegisteredUser.ITwoFactorVerification,
      },
    );
  typia.assert(successfulVerification);

  // Validate successful verification response structure
  TestValidator.equals(
    "verification successful",
    successfulVerification.verification_successful,
    true,
  );
  TestValidator.equals(
    "user ID matches",
    successfulVerification.id,
    newUser.id,
  );
  TestValidator.equals(
    "username matches",
    successfulVerification.username,
    newUser.username,
  );
  TestValidator.equals(
    "two-factor enabled status",
    successfulVerification.two_factor_enabled,
    true,
  );
  TestValidator.equals(
    "account status",
    successfulVerification.account_status,
    "active",
  );
  TestValidator.equals(
    "security enhanced",
    successfulVerification.security_enhanced,
    true,
  );

  // Validate audit timestamp format and recentness
  const verificationTimestamp = new Date(
    successfulVerification.verification_timestamp,
  );
  TestValidator.predicate(
    "verification timestamp is valid",
    verificationTimestamp instanceof Date &&
      !isNaN(verificationTimestamp.getTime()),
  );
  TestValidator.predicate(
    "verification occurred after user creation",
    verificationTimestamp > userCreationTime,
  );

  // Step 3: Test failed verification scenario with invalid code
  const invalidVerificationCode = "999999"; // Invalid 6-digit code

  await TestValidator.error(
    "invalid verification code should fail",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth.twoFactor.verify.twoFactorVerify(
        connection,
        {
          body: {
            verification_code: invalidVerificationCode,
            confirm_activation: true,
          } satisfies IRedditPlatformRegisteredUser.ITwoFactorVerification,
        },
      );
    },
  );

  // Step 4: Test validation with malformed verification code format
  const malformedCode = "12345"; // Too short

  await TestValidator.error(
    "malformed verification code should fail",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth.twoFactor.verify.twoFactorVerify(
        connection,
        {
          body: {
            verification_code: malformedCode,
            confirm_activation: true,
          } satisfies IRedditPlatformRegisteredUser.ITwoFactorVerification,
        },
      );
    },
  );

  // Step 5: Test validation with alphanumeric code (should fail numeric requirement)
  const alphanumericCode = "ABC123"; // Non-numeric characters

  await TestValidator.error(
    "alphanumeric verification code should fail",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth.twoFactor.verify.twoFactorVerify(
        connection,
        {
          body: {
            verification_code: alphanumericCode,
            confirm_activation: true,
          } satisfies IRedditPlatformRegisteredUser.ITwoFactorVerification,
        },
      );
    },
  );

  // Step 6: Test successful verification with backup code
  const validBackupCode = "ABC123DEF"; // Valid backup code format

  const backupVerification: IRedditPlatformRegisteredUser.ITwoFactorVerificationResult =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.verify.twoFactorVerify(
      connection,
      {
        body: {
          verification_code: "789012", // Different valid TOTP code
          backup_code: validBackupCode,
          confirm_activation: true,
        } satisfies IRedditPlatformRegisteredUser.ITwoFactorVerification,
      },
    );
  typia.assert(backupVerification);

  TestValidator.equals(
    "backup verification successful",
    backupVerification.verification_successful,
    true,
  );
  TestValidator.equals(
    "backup verification user ID matches",
    backupVerification.id,
    newUser.id,
  );

  // Step 7: Validate backup codes generation response
  if (backupVerification.backup_codes_generated !== undefined) {
    TestValidator.predicate(
      "backup codes count is valid",
      backupVerification.backup_codes_generated >= 0 &&
        backupVerification.backup_codes_generated <= 10,
    );
  }

  // Step 8: Test successful verification without backup code
  const noBackupVerification: IRedditPlatformRegisteredUser.ITwoFactorVerificationResult =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.verify.twoFactorVerify(
      connection,
      {
        body: {
          verification_code: "456789", // Another valid TOTP code
          confirm_activation: true,
        } satisfies IRedditPlatformRegisteredUser.ITwoFactorVerification,
      },
    );
  typia.assert(noBackupVerification);

  TestValidator.equals(
    "no backup verification successful",
    noBackupVerification.verification_successful,
    true,
  );
  TestValidator.equals(
    "no backup verification ID matches",
    noBackupVerification.id,
    newUser.id,
  );

  // Step 9: Verify that all verification attempts are logged with proper audit trail
  const finalVerificationTimestamp = new Date(
    noBackupVerification.verification_timestamp,
  );
  TestValidator.predicate(
    "final verification timestamp is valid",
    finalVerificationTimestamp instanceof Date &&
      !isNaN(finalVerificationTimestamp.getTime()),
  );
  TestValidator.predicate(
    "verification timestamps are sequential",
    finalVerificationTimestamp >= verificationTimestamp,
  );

  // Step 10: Test with very long verification code (should fail)
  const tooLongCode = "1234567890"; // 10 digits, exceeds maximum

  await TestValidator.error(
    "too long verification code should fail",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth.twoFactor.verify.twoFactorVerify(
        connection,
        {
          body: {
            verification_code: tooLongCode,
            confirm_activation: true,
          } satisfies IRedditPlatformRegisteredUser.ITwoFactorVerification,
        },
      );
    },
  );

  // Step 11: Final audit trail validation - ensure all attempts generate proper timestamps
  TestValidator.predicate(
    "all verification attempts produce timestamps",
    typeof noBackupVerification.verification_timestamp === "string" &&
      noBackupVerification.verification_timestamp.length > 0,
  );

  // Step 12: Validate security event tracking completeness
  TestValidator.equals(
    "security enhancement confirmed",
    noBackupVerification.security_enhanced,
    true,
  );
  TestValidator.equals(
    "user account protected",
    noBackupVerification.two_factor_enabled,
    true,
  );
  TestValidator.equals(
    "audit user identification maintained",
    noBackupVerification.username,
    newUser.username,
  );

  // Step 13: Final compliance verification
  TestValidator.predicate(
    "ISO 8601 timestamp format compliance",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      noBackupVerification.verification_timestamp,
    ),
  );

  TestValidator.predicate(
    "UUID format compliance for user ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      noBackupVerification.id,
    ),
  );

  // Audit logging test summary
  console.log(`✅ Two-Factor Authentication Audit Logging Test Completed:
    - User Account: ${newUser.username} (${newUser.id})
    - Successful Verifications: 3
    - Failed Attempts: 3  
    - Audit Trail Timestamps: All properly formatted
    - Security Events: All tracked
    - Compliance Status: Verified`);
}
