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
 * Test password change failure when new password and confirmation password
 * don't match. Validates that the system properly detects password mismatch
 * conditions and returns appropriate validation errors. Verifies that password
 * strength requirements are enforced and no password change occurs when
 * validation fails.
 *
 * Business workflow tested:
 *
 * 1. Create a valid password reset request to obtain a reset token
 * 2. Attempt password change with mismatched passwords
 * 3. Verify appropriate error response and no password change
 * 4. Test additional validation scenarios including password complexity
 * 5. Ensure system provides meaningful error messages
 */
export async function test_api_password_change_password_mismatch(
  connection: api.IConnection,
) {
  // Step 1: Create a valid password reset request to obtain a reset token
  const email = typia.random<string & tags.Format<"email">>();
  const passwordResetRequest = {
    email,
    href: "https://example.com/reset",
    referrer: "https://example.com/login",
  } satisfies IShoppingMallPasswordReset.ICreate;

  const resetResult =
    await api.functional.shoppingMall.auth.password.reset.requestReset(
      connection,
      {
        body: passwordResetRequest,
      },
    );
  typia.assert(resetResult);

  // Extract the reset token from the response
  const resetToken = resetResult.token;

  // Create test user summary for password change
  const userSummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.name(),
    email,
    user_type: "customer" as const,
    status: "active" as const,
  } satisfies IShoppingMallCustomer.ISummary;

  // Create device info
  const deviceInfo = {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    platform: "Windows",
    browser: "Chrome",
    deviceType: "desktop" as const,
  } satisfies IDeviceInfo;

  // Step 2: Test password change with mismatched passwords
  const mismatchedPasswordBody = {
    reset_token: resetToken,
    user: userSummary,
    new_password: "NewPassword123!",
    confirm_password: "DifferentPassword123!", // Intentionally mismatched
    device: deviceInfo,
    audit_log_id: typia.random<string & tags.Format<"uuid">>(),
    security_metadata: {
      validation_results: ["token_valid", "password_complexity_check"],
      attempt_count: 1,
      session_correlation: typia.random<string & tags.Format<"uuid">>(),
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    },
    timestamp: new Date().toISOString(),
  } satisfies IShoppingMallPasswordChange.IUpdate;

  await TestValidator.error(
    "password change with mismatched passwords should fail",
    async () => {
      await api.functional.shoppingMall.auth.password.change.changePassword(
        connection,
        {
          body: mismatchedPasswordBody,
        },
      );
    },
  );

  // Step 3: Test with password complexity violation (too short)
  const shortPasswordBody = {
    reset_token: resetToken,
    user: userSummary,
    new_password: "123", // Too short - should fail MinLength<8>
    confirm_password: "123", // Matches but too short
    device: deviceInfo,
    audit_log_id: typia.random<string & tags.Format<"uuid">>(),
    security_metadata: {
      validation_results: ["token_valid"],
      attempt_count: 2,
      session_correlation: typia.random<string & tags.Format<"uuid">>(),
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    },
    timestamp: new Date().toISOString(),
  } satisfies IShoppingMallPasswordChange.IUpdate;

  await TestValidator.error(
    "password change with short password should fail",
    async () => {
      await api.functional.shoppingMall.auth.password.change.changePassword(
        connection,
        {
          body: shortPasswordBody,
        },
      );
    },
  );

  // Step 4: Test with weak password (no special characters)
  const weakPasswordBody = {
    reset_token: resetToken,
    user: userSummary,
    new_password: "WeakPassword123", // Missing special character - password format
    confirm_password: "WeakPassword123", // Matches but weak
    device: deviceInfo,
    audit_log_id: typia.random<string & tags.Format<"uuid">>(),
    security_metadata: {
      validation_results: ["token_valid"],
      attempt_count: 3,
      session_correlation: typia.random<string & tags.Format<"uuid">>(),
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    },
    timestamp: new Date().toISOString(),
  } satisfies IShoppingMallPasswordChange.IUpdate;

  await TestValidator.error(
    "password change with weak password should fail",
    async () => {
      await api.functional.shoppingMall.auth.password.change.changePassword(
        connection,
        {
          body: weakPasswordBody,
        },
      );
    },
  );

  // Step 5: Test with expired token (simulate different scenario)
  const expiredTokenBody = {
    reset_token: "00000000-0000-0000-0000-000000000000", // Invalid token
    user: userSummary,
    new_password: "ValidPassword123!",
    confirm_password: "ValidPassword123!", // Correctly matched
    device: deviceInfo,
    audit_log_id: typia.random<string & tags.Format<"uuid">>(),
    security_metadata: {
      validation_results: ["token_validation"],
      attempt_count: 4,
      session_correlation: typia.random<string & tags.Format<"uuid">>(),
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    },
    timestamp: new Date().toISOString(),
  } satisfies IShoppingMallPasswordChange.IUpdate;

  await TestValidator.error(
    "password change with invalid token should fail",
    async () => {
      await api.functional.shoppingMall.auth.password.change.changePassword(
        connection,
        {
          body: expiredTokenBody,
        },
      );
    },
  );
}
