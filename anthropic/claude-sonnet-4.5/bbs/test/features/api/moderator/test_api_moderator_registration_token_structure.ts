import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration JWT token structure validation.
 *
 * This test validates that moderator registration returns properly structured
 * JWT authentication tokens with all required fields and correct expiration
 * periods.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account with valid credentials
 * 2. Extract the token object from the registration response
 * 3. Validate complete response structure using typia.assert
 * 4. Verify expiration periods match specifications (30 minutes for access token,
 *    7 days for refresh token)
 */
export async function test_api_moderator_registration_token_structure(
  connection: api.IConnection,
) {
  // Step 1: Prepare moderator registration request with valid random data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 2: Register new moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate complete response structure (validates ALL fields, types, and formats)
  typia.assert(moderator);

  // Step 4: Extract token object for expiration period validation
  const token: IAuthorizationToken = moderator.token;

  // Step 5: Validate expiration periods match system specifications (business logic validation)
  const now = new Date();
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);

  // Access token should expire in 30 minutes (allow 1 minute tolerance for test execution time)
  const accessTokenExpirationMinutes =
    (expiredAt.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    accessTokenExpirationMinutes >= 29 && accessTokenExpirationMinutes <= 31,
  );

  // Refresh token should be valid for 7 days (allow 5 minute tolerance)
  const refreshTokenExpirationDays =
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token is valid for approximately 7 days",
    refreshTokenExpirationDays >= 6.99 && refreshTokenExpirationDays <= 7.01,
  );
}
