import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_token_refresh_valid(
  connection: api.IConnection,
) {
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string = "StrongPassword123!";

  // 1. Register a new moderator account
  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail,
    });
  typia.assert(registeredModerator);

  // 2. Authenticate moderator to obtain initial access and refresh tokens
  const loginHref: string = "https://example.com/login";
  const loginReferrer: string = "https://example.com/home";
  const loggedinModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password,
        href: loginHref,
        referrer: loginReferrer,
      },
    });
  typia.assert(loggedinModerator);

  // 3. Refresh the moderator's access token using a valid refresh token
  const refreshedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: loggedinModerator.token.refresh,
      },
    });
  typia.assert(refreshedModerator);

  // Validate that the new access token is different from the original one
  TestValidator.notEquals(
    "new access token should be different from the original",
    refreshedModerator.token.access,
    loggedinModerator.token.access,
  );

  // Validate that the refresh token remains unchanged
  TestValidator.equals(
    "refresh token should remain unchanged after refresh",
    refreshedModerator.token.refresh,
    loggedinModerator.token.refresh,
  );

  // Validate that the new access token has a new expiration time
  TestValidator.notEquals(
    "new access token expiration should be different from original",
    refreshedModerator.token.expired_at,
    loggedinModerator.token.expired_at,
  );

  // Validate that the refresh token expiration remains the same
  TestValidator.equals(
    "refresh token expiration should remain unchanged",
    refreshedModerator.token.refreshable_until,
    loggedinModerator.token.refreshable_until,
  );

  // Validate that the moderator ID remains the same
  TestValidator.equals(
    "moderator ID should remain unchanged after refresh",
    refreshedModerator.id,
    loggedinModerator.id,
  );
}
