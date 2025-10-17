import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";

/**
 * Test token refresh rejection for suspended member accounts.
 *
 * This test validates the security mechanism that prevents suspended users from
 * maintaining active sessions through token refresh. When an administrator
 * suspends a member account, all token refresh attempts should be rejected,
 * even if the refresh token itself is valid and non-expired.
 *
 * Test workflow:
 *
 * 1. Create a new member account and obtain authentication tokens
 * 2. Create an administrator account with suspension privileges
 * 3. Administrator suspends the member account
 * 4. Attempt to refresh member's access token using valid refresh token
 * 5. Verify that refresh is rejected due to account suspension
 *
 * This ensures that account suspensions are immediately effective and users
 * cannot bypass suspension by using previously issued refresh tokens.
 */
export async function test_api_member_token_refresh_with_suspended_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account and obtain initial tokens
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const memberRegistration = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberRegistration);

  // Store the member's refresh token for later use
  const memberRefreshToken = memberRegistration.token.refresh;

  // Step 2: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass456!@#";
  const adminUsername = RandomGenerator.alphaNumeric(12);

  const adminRegistration = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    },
  );
  typia.assert(adminRegistration);

  // Step 3: Administrator suspends the member account
  const suspension =
    await api.functional.discussionBoard.administrator.suspensions.create(
      connection,
      {
        body: {
          member_id: memberRegistration.id,
          suspension_reason:
            "Testing token refresh rejection for suspended accounts. This is an automated test suspension.",
          duration_days: 7,
        } satisfies IDiscussionBoardSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Verify suspension was created successfully
  TestValidator.equals("suspension is active", suspension.is_active, true);
  TestValidator.equals(
    "suspended member matches",
    suspension.member_id,
    memberRegistration.id,
  );

  // Step 4: Attempt to refresh the member's token (should fail)
  await TestValidator.error(
    "token refresh should be rejected for suspended account",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: memberRefreshToken,
        } satisfies IDiscussionBoardMember.IRefresh,
      });
    },
  );
}
