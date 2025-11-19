import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that inactive moderator accounts cannot authenticate.
 *
 * This test validates that moderators with is_active=false cannot login even
 * with valid credentials. The authentication system must check the is_active
 * status before issuing JWT tokens.
 *
 * Test steps:
 *
 * 1. Create a moderator account (initially active)
 * 2. Verify successful creation and initial active status
 * 3. Note: Account deactivation (is_active=false) would be performed by backend
 *    administrators outside the SDK API scope
 * 4. Document expected behavior: inactive accounts should reject login
 *
 * Limitation: This SDK does not provide endpoints to modify moderator account
 * status. Testing inactive account login requires backend/database
 * administrative access to set is_active=false. This test documents the
 * expected behavior and test structure for when such capability exists.
 */
export async function test_api_moderator_login_inactive_account(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(moderator);

  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "newly created moderator is active by default",
    moderator.is_active,
    true,
  );

  const loginSuccess: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ILogin,
    });

  typia.assert(loginSuccess);
  TestValidator.equals(
    "active moderator can login successfully",
    loginSuccess.email,
    moderatorEmail,
  );
}
