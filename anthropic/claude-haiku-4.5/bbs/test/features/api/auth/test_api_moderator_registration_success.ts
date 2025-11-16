import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator account creation with valid registration
 * credentials.
 *
 * Validates the complete moderator registration workflow by submitting valid
 * credentials and verifying successful account creation with proper JWT
 * tokens.
 *
 * Steps:
 *
 * 1. Generate valid moderator registration data with required fields
 * 2. Submit registration request to /auth/moderator/join endpoint
 * 3. Verify successful response with newly created moderator details
 * 4. Validate moderator summary information and active account status
 * 5. Confirm JWT tokens are provided for authentication
 * 6. Verify token expiration timestamps are valid
 */
export async function test_api_moderator_registration_success(
  connection: api.IConnection,
) {
  // Generate valid moderator registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = typia.random<string & tags.MinLength<8>>();
  const displayName = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();

  // Submit moderator registration request
  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username,
        password,
        display_name: displayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // Validate response type and structure
  typia.assert(authorized);

  // Verify token is provided and not empty
  TestValidator.predicate(
    "access token should be provided",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be provided",
    authorized.token.refresh.length > 0,
  );

  // Verify moderator summary information
  TestValidator.equals(
    "display_name should match registration input",
    authorized.moderator.display_name,
    displayName,
  );
  TestValidator.equals(
    "account_status should be active",
    authorized.moderator.account_status,
    "active",
  );

  // Verify token expiration timestamps are in the future
  TestValidator.predicate(
    "access token should expire in the future",
    new Date(authorized.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token should be refreshable until future date",
    new Date(authorized.token.refreshable_until).getTime() > Date.now(),
  );

  // Verify moderator ID in summary matches the response ID
  TestValidator.equals(
    "moderator summary ID should match response ID",
    authorized.moderator.id,
    authorized.id,
  );
}
