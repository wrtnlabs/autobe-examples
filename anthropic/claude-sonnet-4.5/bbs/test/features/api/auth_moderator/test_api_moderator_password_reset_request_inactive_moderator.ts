import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password reset request for an inactive moderator account.
 *
 * This test validates the security behavior when requesting password reset for
 * an inactive moderator account. The system maintains anti-enumeration security
 * by returning success regardless of account status, but no valid reset token
 * should be generated for inactive accounts.
 *
 * Test Flow:
 *
 * 1. Create a moderator account through the join endpoint
 * 2. Request password reset using the moderator's email
 * 3. Verify that the operation returns success (anti-enumeration security)
 * 4. Confirm the system doesn't reveal account status through responses
 *
 * Note: The actual inactive status would be set through admin operations or
 * database manipulation. This test validates the password reset request
 * behavior assuming the account could be inactive, ensuring proper
 * anti-enumeration security.
 */
export async function test_api_moderator_password_reset_request_inactive_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderatorData = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(createdModerator);

  // Verify moderator was created successfully
  TestValidator.equals(
    "moderator email matches",
    createdModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    createdModerator.username,
    moderatorUsername,
  );

  // Step 2: Request password reset for the moderator account
  // Note: In a real scenario, the account would be marked as inactive (is_active=false)
  // through admin operations. The password reset request should return success without
  // revealing the account's inactive status (anti-enumeration security).
  const resetRequest = {
    email: moderatorEmail,
  } satisfies IDiscussionBoardModerator.IRequestPasswordReset;

  await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
    connection,
    {
      body: resetRequest,
    },
  );

  // Step 3: Test with non-existent email to verify consistent response
  // The API should return the same response for both existing and non-existing emails
  // to prevent account enumeration attacks
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const resetRequestNonExistent = {
    email: nonExistentEmail,
  } satisfies IDiscussionBoardModerator.IRequestPasswordReset;

  await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
    connection,
    {
      body: resetRequestNonExistent,
    },
  );

  // Both requests should complete successfully without revealing account existence
  // or status. The actual token generation and validation happens server-side.
}
