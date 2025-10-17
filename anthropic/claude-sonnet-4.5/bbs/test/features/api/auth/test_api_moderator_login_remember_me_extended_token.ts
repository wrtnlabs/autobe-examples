import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator login functionality and token validation.
 *
 * Note: The original scenario requested testing Remember Me functionality with
 * extended token expiration, but the IDiscussionBoardModerator.ILogin DTO does
 * not include a remember_me property. This test has been rewritten to validate
 * standard moderator login and token structure.
 *
 * Steps:
 *
 * 1. Create a new moderator account
 * 2. Login with the same credentials
 * 3. Verify token response structure
 * 4. Validate token properties are properly formatted
 */
export async function test_api_moderator_login_remember_me_extended_token(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const createBody = {
    appointed_by_admin_id: adminId,
    username: username,
    email: email,
    password: password,
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });

  typia.assert(createdModerator);
  TestValidator.predicate(
    "moderator created successfully",
    typeof createdModerator.id === "string",
  );
  TestValidator.predicate(
    "creation returns access token",
    createdModerator.token.access.length > 0,
  );

  // Step 2: Login with valid credentials
  const loginBody = {
    email: email,
    password: password,
  } satisfies IDiscussionBoardModerator.ILogin;

  const loggedInModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });

  typia.assert(loggedInModerator);

  // Step 3: Verify token structure and validity
  const token: IAuthorizationToken = loggedInModerator.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token is non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    token.refresh.length > 0,
  );

  // Step 4: Validate token timestamps
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "access token expires in future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expires in future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );

  // Verify moderator ID consistency
  TestValidator.equals(
    "moderator ID matches",
    createdModerator.id,
    loggedInModerator.id,
  );
}
