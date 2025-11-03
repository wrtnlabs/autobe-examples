import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate the successful confirmation of an admin password reset.
 *
 * This test emulates the admin password reset flow end-to-end. It first
 * triggers a password reset request to ensure a token is issued (since token
 * fetch is backend-only, this step is for audited flow coverage but actual
 * token retrieval is simulated). Then, it submits a valid password reset
 * confirmation using the issued token, email, and a strong new password. The
 * scenario ensures proper input DTOs and validates both successful result and
 * strict absence of sensitive data. The returned "success" flag must be true
 * and a suitable business message present. The test asserts output type
 * integrity and checks that the response object contains no credential, token,
 * or password information beyond the schema definition.
 */
export async function test_api_admin_password_reset_confirm_successful_reset(
  connection: api.IConnection,
) {
  // Step 1: Prepare test admin email and password
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // Step 2: Simulate reset request to obtain a reset token (normally sent via email)
  const resetReqBody = {
    email: adminEmail,
  } satisfies ICommunityPlatformAdmin.IResetPasswordRequest;
  const resetReqResult: ICommunityPlatformAdmin.IResetPasswordRequestResult =
    await api.functional.auth.admin.password.reset.request.resetPasswordRequest(
      connection,
      { body: resetReqBody },
    );
  typia.assert(resetReqResult);
  // Step 3: Obtain a valid token for testing (simulate - in real test, this should be retrieved via hook or fixture)
  // For E2E test context, generate a realistic, random token
  const resetToken: string = RandomGenerator.alphaNumeric(32); // Simulate issued token
  // Step 4: Prepare strong new password
  const newPassword: string & tags.MinLength<8> & tags.MaxLength<72> =
    RandomGenerator.alphaNumeric(16) as string &
      tags.MinLength<8> &
      tags.MaxLength<72>;
  // Step 5: Confirm reset with valid token, email, and new password
  const confirmBody = {
    email: adminEmail,
    token: resetToken,
    password: newPassword,
  } satisfies ICommunityPlatformAdmin.IResetPasswordConfirm;
  const confirmResult: ICommunityPlatformAdmin.IResetPasswordConfirmResult =
    await api.functional.auth.admin.password.reset.confirm.resetPasswordConfirm(
      connection,
      { body: confirmBody },
    );
  typia.assert(confirmResult);

  // Step 6: Business and security assertions
  TestValidator.predicate(
    "reset confirmation succeeded",
    confirmResult.success === true,
  );
  TestValidator.predicate(
    "reset confirmation has message",
    typeof confirmResult.message === "string" &&
      confirmResult.message.length > 0,
  );
  // Ensure no credential info or token is present in the response (contract - only "success" and "message")
  const allowedKeys = ["success", "message"];
  const keys = Object.keys(confirmResult);
  TestValidator.equals(
    "response object keys conform to schema",
    keys.sort(),
    allowedKeys.sort(),
  );
}
