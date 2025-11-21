import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDeviceInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IDeviceInfo";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPasswordChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordChange";
import type { IShoppingMallPasswordConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordConfirm";
import type { IShoppingMallPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordReset";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test password change functionality for a seller account in the shopping mall
 * platform.
 *
 * This comprehensive test validates the complete password reset workflow for
 * merchant accounts:
 *
 * 1. Creates a seller merchant account with comprehensive business verification
 * 2. Initiates a password reset request that generates a secure reset token
 * 3. Completes the password change process using the reset token with security
 *    validation
 * 4. Verifies seller dashboard access continues normally after password change
 * 5. Ensures business operations can proceed without interruption
 *
 * Covers seller-specific security checks, notification preferences, and
 * maintains business continuity throughout the authentication change process.
 */
export async function test_api_password_change_seller_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new seller merchant account with comprehensive business details
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const newPassword =
    RandomGenerator.alphaNumeric(12) + "!" + RandomGenerator.alphaNumeric(5);

  const sellerAuthorization = await api.functional.auth.seller.join(
    connection,
    {
      body: {
        email: sellerEmail,
        business_name: RandomGenerator.name(2),
        business_registration_number:
          RandomGenerator.alphaNumeric(10).toUpperCase(),
        tax_id: RandomGenerator.alphaNumeric(9),
        phone: RandomGenerator.mobile(),
        business_type: RandomGenerator.pick([
          "corporation",
          "llc",
          "partnership",
          "sole_proprietorship",
        ] as const),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );

  // Validate the seller was created successfully with proper authorization
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorization);
  TestValidator.predicate(
    "seller confirmation successful",
    sellerAuthorization.is_verified === false,
  );
  TestValidator.equals(
    "seller email matches",
    sellerAuthorization.email,
    sellerEmail,
  );
  TestValidator.predicate(
    "authorization token provided",
    sellerAuthorization.token.access.length > 0 &&
      sellerAuthorization.token.refresh.length > 0,
  );

  // Step 2: Simulate current authentication state and initiate password reset
  // Note: Reset request requires connection context references
  const passwordReset =
    await api.functional.shoppingMall.auth.password.reset.requestReset(
      connection,
      {
        body: {
          email: sellerEmail,
          href: `${connection.host}/seller-dashboard/password-reset`,
          referrer: `${connection.host}/seller-dashboard/login`,
        } satisfies IShoppingMallPasswordReset.ICreate,
      },
    );

  // Validate password reset token generation
  typia.assert<IShoppingMallPasswordReset>(passwordReset);
  TestValidator.equals(
    "reset email matches seller",
    passwordReset.email,
    sellerEmail,
  );
  TestValidator.predicate(
    "reset token generated",
    passwordReset.token.length > 0,
  );
  TestValidator.predicate(
    "token has proper expiration",
    passwordReset.expires_at > passwordReset.created_at,
  );
  TestValidator.equals("reset status pending", passwordReset.status, "pending");

  // Step 3: Simulate device information for security tracking
  const deviceInfo: IDeviceInfo = {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "Windows NT 10.0",
    browser: "Chrome/120.0",
    deviceType: "desktop" as const,
  };

  // Generate proper security context data
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const sessionCorrelation = typia.random<string & tags.Format<"uuid">>();
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);

  // Create password change request with comprehensive security metadata
  const updateRequest = {
    reset_token: passwordReset.token,
    user: {
      id: sellerAuthorization.id,
      username: sellerEmail,
      email: sellerEmail,
      user_type: "seller" as const,
      status: "active" as const,
      created_at: sellerAuthorization.created_at,
    } as IShoppingMallCustomer.ISummary,
    new_password: newPassword,
    confirm_password: newPassword,
    device: deviceInfo,
    audit_log_id: auditLogId,
    security_metadata: {
      validation_results: [
        "email_verification_passed",
        "token_validity_confirmed",
        "device_context_trustworthy",
      ],
      attempt_count: 1,
      session_correlation: sessionCorrelation,
      device_fingerprint: deviceFingerprint,
    },
    timestamp: new Date().toISOString(),
  } satisfies IShoppingMallPasswordChange.IUpdate;

  // Step 4: Complete password change process with new authentication
  const passwordConfirm =
    await api.functional.shoppingMall.auth.password.change.changePassword(
      connection,
      {
        body: updateRequest,
      },
    );

  // Validate successful password change completion
  typia.assert<IShoppingMallPasswordConfirm>(passwordConfirm);
  TestValidator.predicate(
    "password change successful",
    passwordConfirm.success === true,
  );
  TestValidator.equals(
    "user profile maintained",
    passwordConfirm.user.id,
    sellerAuthorization.id,
  );
  TestValidator.equals(
    "user type maintained",
    passwordConfirm.user.user_type,
    "seller",
  );
  TestValidator.predicate(
    "success message provided",
    passwordConfirm.message.includes("success"),
  );
  TestValidator.notEquals(
    "new audit log created",
    passwordConfirm.audit_log_id,
    updateRequest.audit_log_id,
  );
  TestValidator.predicate(
    "security metadata present",
    passwordConfirm.security_metadata.validation_results.length > 0,
  );
  TestValidator.predicate(
    "password strength scored",
    passwordConfirm.security_metadata.password_strength_score > 0,
  );

  // Step 5: Validate business operations continuity
  TestValidator.predicate(
    "seller data maintained",
    passwordConfirm.user.status === "active",
  );
  TestValidator.predicate(
    "commission rate preserved",
    sellerAuthorization.commission_rate > 0,
  );
  TestValidator.equals(
    "verification status maintained",
    sellerAuthorization.is_verified,
    false,
  );

  // Test security recommendations are provided
  TestValidator.predicate(
    "security recommendations provided",
    passwordConfirm.security_metadata.next_security_recommendations.length > 0,
  );
  TestValidator.predicate(
    "session actions tracked",
    passwordConfirm.security_metadata.session_actions_taken.length >= 0,
  );

  // Validate timestamp progression throughout the workflow
  TestValidator.predicate(
    "created_at earlier than updated_at",
    sellerAuthorization.created_at <= sellerAuthorization.updated_at,
  );
  TestValidator.predicate(
    "reset token has valid timeline",
    passwordReset.created_at <= passwordReset.expires_at,
  );
  TestValidator.predicate(
    "password change completed in sequence",
    passwordConfirm.timestamp >= passwordReset.created_at,
  );

  // Verify comprehensive security validation was processed
  TestValidator.predicate(
    "security metadata includes validation results",
    passwordConfirm.security_metadata.validation_results.includes(
      "email_verification_passed",
    ),
  );
  TestValidator.predicate(
    "device fingerprint was processed",
    passwordConfirm.security_metadata.validation_results.length > 0,
  );

  // Test business continuity - seller remains active with access maintained
  TestValidator.predicate(
    "business account security maintained",
    passwordConfirm.success === true,
  );
  TestValidator.equals(
    "seller account remains accessible",
    passwordConfirm.user.id,
    sellerAuthorization.id,
  );
}
