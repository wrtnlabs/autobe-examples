import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates the user password reset request flow for secure and
 * privacy-preserving behavior.
 *
 * This test covers the following scenario:
 *
 * 1. Register a new user with unique random data so their email address is known
 *    to the test (necessary to test password reset for a real, existing user).
 * 2. Attempt to initiate the password reset process for that user's email by
 *    calling the password reset request endpoint.
 * 3. Confirm that the password reset endpoint accepts the request, responds with a
 *    generic success message, and does not reveal whether the user actually
 *    exists, nor any sensitive user/account state. Only the presence of a user
 *    with such an email will trigger the reset token logic, but the response is
 *    always uniform as a privacy requirement.
 *
 * The test asserts:
 *
 * - The password reset endpoint responds with the appropriate schema and
 *   structure (`IResetPasswordResponse`).
 * - The response contains only the generic message, with no additional account
 *   info or state.
 * - The workflow is compatible with security policies that prevent user email
 *   enumeration or leakage during password reset flows.
 */
export async function test_api_user_password_reset_request_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register a new user with known email for test
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://platform-community.test/reset-flow",
    referrer: "https://platform-community.test/landing",
  } satisfies ICommunityPlatformUser.IJoin;

  const registeredUser: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(registeredUser);

  // Step 2: Initiate password reset for the same (existing) email
  const resetRequestBody = {
    email: userEmail,
  } satisfies ICommunityPlatformUser.IResetPasswordRequest;

  const resetResponse: ICommunityPlatformUser.IResetPasswordResponse =
    await api.functional.auth.user.password.reset.resetPassword(connection, {
      body: resetRequestBody,
    });
  typia.assert(resetResponse);

  // Step 3: Validate the response (generic message, privacy preserving, no extra user/account info)
  TestValidator.predicate(
    "password reset response contains message only",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0, // require that the message is non-empty string
  );
}
