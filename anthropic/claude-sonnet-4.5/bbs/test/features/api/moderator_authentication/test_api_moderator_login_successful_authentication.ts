import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator login workflow with valid credentials.
 *
 * This test validates the complete moderator authentication flow from account
 * creation through successful login and token issuance. It ensures that:
 *
 * 1. A new moderator account can be created with valid credentials
 * 2. The moderator can authenticate using the login operation
 * 3. Valid JWT access and refresh tokens are issued
 * 4. Token expiration times are properly set and in correct order
 * 5. The access token can be immediately used for authenticated operations
 *
 * The test follows the business flow: moderator registration → login → token
 * validation
 */
export async function test_api_moderator_login_successful_authentication(
  connection: api.IConnection,
) {
  // Step 1: Generate test credentials for moderator registration
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
  const appointedByAdminId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create a new moderator account
  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: appointedByAdminId,
        username: username,
        email: email,
        password: password,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(registeredModerator);

  // Step 3: Verify registration response contains valid token and moderator ID
  TestValidator.predicate(
    "registration should return moderator ID",
    registeredModerator.id.length > 0,
  );
  typia.assert(registeredModerator.token);

  // Step 4: Authenticate the moderator using login operation
  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(authenticatedModerator);

  // Step 5: Verify login response structure
  TestValidator.predicate(
    "login should return moderator ID",
    authenticatedModerator.id.length > 0,
  );
  typia.assert(authenticatedModerator.token);

  // Step 6: Validate JWT token structure
  const token: IAuthorizationToken = authenticatedModerator.token;
  TestValidator.predicate(
    "access token should be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    token.refresh.length > 0,
  );

  // Step 7: Verify token expiration timestamps are valid date-time strings
  typia.assert<string & tags.Format<"date-time">>(token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(token.refreshable_until);

  // Step 8: Verify token expiration ordering and validity
  const accessExpiration = new Date(token.expired_at);
  const refreshExpiration = new Date(token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expiration should be in the future",
    accessExpiration.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshExpiration.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshExpiration.getTime() > accessExpiration.getTime(),
  );

  // Step 9: Verify the moderator ID matches between registration and login
  TestValidator.equals(
    "moderator ID should match between registration and login",
    registeredModerator.id,
    authenticatedModerator.id,
  );

  // Step 10: Verify access token is set in connection headers for authenticated operations
  TestValidator.predicate(
    "access token should be set in connection headers",
    connection.headers?.Authorization === token.access,
  );
}
