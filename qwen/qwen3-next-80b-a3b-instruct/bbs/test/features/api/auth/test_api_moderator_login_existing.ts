import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_login_existing(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account with email string
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail,
    });
  typia.assert(moderator);

  // Step 2: Authenticate the moderator with their email and password
  const loginBody: IDiscussionBoardModerator.ILogin = {
    email: moderatorEmail,
    password: "SecurePassword123!",
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardModerator.ILogin;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(authenticatedModerator);

  // Step 3: Validate the authentication response structure
  TestValidator.equals(
    "moderator ID matches",
    authenticatedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "access token type is string",
    typeof authenticatedModerator.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token type is string",
    typeof authenticatedModerator.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at type is string",
    typeof authenticatedModerator.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until type is string",
    typeof authenticatedModerator.token.refreshable_until,
    "string",
  );
  TestValidator.predicate(
    "access token is not empty",
    () => authenticatedModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    () => authenticatedModerator.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at has ISO date-time format", () => {
    // Validate with date constructor since typia.assert already validates format
    // but we want to ensure the string is a valid date
    const date = new Date(authenticatedModerator.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("refreshable_until has ISO date-time format", () => {
    const date = new Date(authenticatedModerator.token.refreshable_until);
    return !isNaN(date.getTime());
  });
}
