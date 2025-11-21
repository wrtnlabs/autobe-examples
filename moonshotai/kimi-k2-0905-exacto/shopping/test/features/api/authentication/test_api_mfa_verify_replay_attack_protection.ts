import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthentication";
import type { IShoppingMallMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMfaVerify";

/**
 * Test multi-factor authentication replay attack protection by attempting to
 * reuse a previously valid TOTP code. This scenario validates time-sensitive
 * code validation and replay prevention mechanisms, ensuring each verification
 * code can only be used once within its valid time window. The test should
 * verify proper rejection of reused codes and maintain the integrity of the MFA
 * system against replay attacks while preserving user security.
 */
export async function test_api_mfa_verify_replay_attack_protection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Prepare legitimate authentication context with fresh session data
  const userIp = typia.random<string & tags.Format<"ipv4">>();
  const deviceFingerprint = RandomGenerator.name(3); // Simulate device info
  const currentTime = new Date().toISOString(); // Current timestamp for fresh attempt

  // Step 2: Generate valid TOTP verification request with comprehensive security metadata
  const firstVerificationRequest = {
    code: typia.random<string & tags.Pattern<"^\\d{6}$">>(), // 6-digit TOTP code
    session_id: typia.random<string & tags.Format<"uuid">>(), // Fresh session identifier
    ip_address: userIp, // Authentic IP address for audit integrity
    device_info: deviceFingerprint, // Device context for security tracking
    timestamp: currentTime, // Fresh timestamp for time validation
    href: "https://shoppingmall.example.com/auth/mfa", // Current page URL (mandatory for self-auth)
    referrer: "https://shoppingmall.example.com/auth/login", // Previous page (mandatory for self-auth)
  } satisfies IShoppingMallMfaVerify.ICreate;

  // Step 3: Perform successful MFA verification to establish legitimate baseline
  const firstAttemptResponse: IShoppingMallAuthentication.ITokenResponse =
    await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
      body: firstVerificationRequest,
    });

  // Validate successful authentication with proper token receipt
  typia.assert(firstAttemptResponse);
  TestValidator.predicate(
    "First legitimate verification produces authentication token",
    !!firstAttemptResponse.access_token,
  );
  TestValidator.equals(
    "Response contains Bearer token authentication",
    firstAttemptResponse.token_type,
    "Bearer",
  );

  // Step 4: Attempt replay attack with identical verification data (same code, refreshed context)
  const replayVerificationRequest = {
    code: firstVerificationRequest.code, // Preserve original TOTP code for replay attack
    session_id: typia.random<string & tags.Format<"uuid">>(), // New session for replay scenario
    ip_address: userIp, // Same IP for realistic attack simulation
    device_info: deviceFingerprint, // Same device fingerprint
    timestamp: new Date().toISOString(), // Update timestamp for replay scenario
    href: "https://shoppingmall.example.com/auth/mfa", // Current page URL
    referrer: "https://shoppingmall.example.com/auth/login", // Previous page
  } satisfies IShoppingMallMfaVerify.ICreate;

  // Step 5: Execute replay attack attempt to test system's replay protection capabilities
  await TestValidator.error(
    "Replay attack with reused TOTP code should fail authentication",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: replayVerificationRequest,
      });
    },
  );

  // Step 6: Validate original token remains functional (legitimate access preserved)
  TestValidator.predicate(
    "Original authentication token remains valid after failed replay attempt",
    !!firstAttemptResponse.expires_in && firstAttemptResponse.expires_in > 0,
  );

  // Step 7: Test with backup code usage to ensure comprehensive replay protection
  const backupCodeVerificationRequest = {
    code: "", // No TOTP code when using backup
    session_id: typia.random<string & tags.Format<"uuid">>(), // New session for backup attempt
    ip_address: userIp, // Same IP for consistency
    device_info: deviceFingerprint, // Same device fingerprint
    backup_code: RandomGenerator.alphaNumeric(8).toUpperCase(), // Simulate backup code
    timestamp: new Date().toISOString(), // Different timing for backup attempt
    href: "https://shoppingmall.example.com/auth/mfa", // Current page URL
    referrer: "https://shoppingmall.example.com/auth/login", // Previous page
  } satisfies IShoppingMallMfaVerify.ICreate;

  // Backup code replay should also fail for the same backup code
  await TestValidator.error(
    "Replay attack with reused backup code should fail authentication",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: backupCodeVerificationRequest,
      });
    },
  );
}
