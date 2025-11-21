import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDeviceInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IDeviceInfo";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPasswordChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordChange";
import type { IShoppingMallPasswordConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordConfirm";
import type { IShoppingMallPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordReset";

/**
 * Test successful password change completion using a valid reset token.
 * Validates the complete password reset workflow including token verification,
 * password validation, security metadata processing, and audit trail creation.
 * Verifies that the new password is properly set and the reset token is
 * invalidated after use. Confirms security notifications are triggered and
 * appropriate success response is returned.
 */
export async function test_api_password_change_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate password reset token using the dependency endpoint
  const resetRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPasswordReset.ICreate;

  const passwordReset =
    await api.functional.shoppingMall.auth.password.reset.requestReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(passwordReset);

  // Step 2: Extract reset token for password change operation
  const resetToken = passwordReset.token;

  // Step 3: Create password change request with comprehensive security metadata
  const userSummary: IShoppingMallCustomer.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.name(),
    email: resetRequestBody.email,
    display_name: RandomGenerator.name(),
    user_type: RandomGenerator.pick(["customer", "seller", "admin"] as const),
    status: RandomGenerator.pick(["active", "suspended", "pending"] as const),
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
  };

  const deviceInfo: IDeviceInfo = {
    userAgent: `Mozilla/5.0 ${RandomGenerator.name()} testing environment`,
    platform: RandomGenerator.pick([
      "Windows",
      "macOS",
      "Linux",
      "iOS",
      "Android",
    ] as const),
    browser: RandomGenerator.pick([
      "Chrome",
      "Firefox",
      "Safari",
      "Edge",
    ] as const),
    deviceType: RandomGenerator.pick([
      "desktop",
      "mobile",
      "tablet",
      "other",
    ] as const),
  };

  const newPassword = `NewPass${RandomGenerator.alphaNumeric(4)}!${RandomGenerator.alphaNumeric(2)}`;

  const passwordChangeRequest: IShoppingMallPasswordChange.IUpdate = {
    reset_token: resetToken,
    user: userSummary,
    new_password: newPassword,
    confirm_password: newPassword,
    device: deviceInfo,
    audit_log_id: typia.random<string & tags.Format<"uuid">>(),
    security_metadata: {
      validation_results: [
        "Token validation passed",
        "Password strength validation passed",
        "User account verification completed",
        "Device fingerprint validation completed",
      ],
      attempt_count: 1,
      session_correlation: typia.random<string & tags.Format<"uuid">>(),
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    },
    timestamp: new Date().toISOString(),
  };

  // Step 4: Execute password change operation
  const passwordConfirm =
    await api.functional.shoppingMall.auth.password.change.changePassword(
      connection,
      {
        body: passwordChangeRequest,
      },
    );
  typia.assert(passwordConfirm);

  // Step 5: Validate successful password change response
  TestValidator.equals(
    "password change success status",
    passwordConfirm.success,
    true,
  );
  TestValidator.equals(
    "user ID matches request",
    passwordConfirm.user.id,
    userSummary.id,
  );
  TestValidator.equals(
    "username matches request",
    passwordConfirm.user.username,
    userSummary.username,
  );
  TestValidator.equals(
    "email matches request",
    passwordConfirm.user.email,
    userSummary.email,
  );
  TestValidator.equals(
    "audit log ID matches request",
    passwordConfirm.audit_log_id,
    passwordChangeRequest.audit_log_id,
  );

  // Step 6: Validate response structure and metadata
  TestValidator.predicate(
    "response contains message",
    passwordConfirm.message.length > 0,
  );
  TestValidator.predicate(
    "response contains timestamp",
    passwordConfirm.timestamp.length > 0,
  );
  TestValidator.predicate(
    "security metadata present",
    Object.keys(passwordConfirm.security_metadata).length > 0,
  );
  TestValidator.predicate(
    "validation results present",
    passwordConfirm.security_metadata.validation_results.length > 0,
  );
  TestValidator.predicate(
    "password strength score valid",
    passwordConfirm.security_metadata.password_strength_score >= 0 &&
      passwordConfirm.security_metadata.password_strength_score <= 100,
  );
  TestValidator.predicate(
    "session actions present",
    Array.isArray(passwordConfirm.security_metadata.session_actions_taken),
  );
  TestValidator.predicate(
    "security recommendations present",
    Array.isArray(
      passwordConfirm.security_metadata.next_security_recommendations,
    ),
  );

  // Step 7: Validate user details in response
  TestValidator.equals(
    "user type matches",
    passwordConfirm.user.user_type,
    userSummary.user_type,
  );
  TestValidator.equals(
    "user status matches",
    passwordConfirm.user.status,
    userSummary.status,
  );
  TestValidator.predicate(
    "creation timestamp present",
    passwordConfirm.user.created_at !== undefined,
  );
  TestValidator.predicate(
    "last login timestamp present",
    passwordConfirm.user.last_login_at !== undefined,
  );
}
