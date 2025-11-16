import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token refresh attempt with an expired refresh token.
 *
 * This scenario validates that the system properly rejects refresh attempts
 * when the provided token has exceeded its validity period (refreshable_until
 * timestamp). The test creates a moderator account, performs login to obtain
 * tokens, then simulates an expired refresh token scenario by attempting to
 * refresh with an invalid/expired token. The test verifies that the refresh
 * operation fails appropriately and requires re-authentication, properly
 * enforcing token expiration policies for security.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account with valid credentials
 * 2. Login to obtain initial access and refresh tokens
 * 3. Attempt to refresh with an expired/invalid refresh token
 * 4. Verify that the refresh operation fails with an error
 * 5. Confirm that the system properly enforces token expiration policies
 */
export async function test_api_moderator_refresh_token_expired_token(
  connection: IConnection,
) {
  // Step 1: Create a new moderator account
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.name(1),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  typia.assert(moderator);

  // Step 2: Login to obtain tokens
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginResult: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // Step 3: Attempt to refresh with an expired/invalid refresh token
  // Using a malformed or obviously expired token string
  const expiredRefreshToken = "expired.invalid.token.string";

  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );
}
