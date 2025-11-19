import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Validate JWT token generation upon successful contributor registration.
 *
 * Tests the registration endpoint POST /auth/contributor/join to ensure:
 *
 * 1. New contributor accounts can be registered with valid credentials
 * 2. Access tokens are valid for 30 minutes from registration
 * 3. Refresh tokens are valid for 7 days from registration
 * 4. Both tokens have proper ISO 8601 formatted expiration timestamps
 * 5. Expiration timestamps are in the future relative to registration time
 * 6. Account is created with 'active' status and email not yet verified
 * 7. All required contributor identity fields are included in response
 *
 * Process:
 *
 * 1. Capture the current registration timestamp
 * 2. Register a new contributor with valid credentials and tracking information
 * 3. Validate the response includes all required fields and proper token structure
 * 4. Verify access token expiration is approximately 30 minutes in the future
 * 5. Verify refresh token expiration is approximately 7 days in the future
 * 6. Confirm both timestamps are in ISO 8601 format and are valid dates
 * 7. Validate contributor account details match the registration input
 */
export async function test_api_contributor_registration_token_generation(
  connection: api.IConnection,
) {
  // Capture registration timestamp for token expiration verification
  const registrationTime = new Date();

  // Generate unique contributor registration data
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "SecurePassword123!"; // Password meeting requirements: 8+ chars, uppercase, lowercase, number, special char
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Register new contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies IDiscussionBoardContributor.ICreate,
    });

  // Validate response structure and types
  typia.assert(contributor);

  // Validate contributor identity information
  TestValidator.equals(
    "contributor email matches registration input",
    contributor.email,
    email,
  );
  TestValidator.equals(
    "contributor username matches registration input",
    contributor.username,
    username,
  );
  TestValidator.equals(
    "account status is active after registration",
    contributor.account_status,
    "active",
  );
  TestValidator.predicate(
    "email is not yet verified after registration",
    !contributor.email_verified,
  );

  // Validate token structure exists
  TestValidator.predicate(
    "token object exists",
    contributor.token !== null && contributor.token !== undefined,
  );
  const token: IAuthorizationToken = contributor.token;
  typia.assert(token);

  // Validate token format and content
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // Parse expiration timestamps
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);

  // Validate timestamp formats are valid ISO 8601 dates
  TestValidator.predicate(
    "expired_at is valid ISO 8601 datetime",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 datetime",
    !isNaN(refreshableUntil.getTime()),
  );

  // Validate expiration timestamps are in the future
  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > registrationTime,
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil > registrationTime,
  );

  // Validate access token expiration is approximately 30 minutes
  const accessTokenExpirationMs =
    expiredAt.getTime() - registrationTime.getTime();
  const thirtyMinutesMs = 30 * 60 * 1000;
  const accessTokenTolerance = 30 * 1000; // Allow 30 second tolerance for processing time
  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    Math.abs(accessTokenExpirationMs - thirtyMinutesMs) <= accessTokenTolerance,
  );

  // Validate refresh token expiration is approximately 7 days
  const refreshTokenExpirationMs =
    refreshableUntil.getTime() - registrationTime.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const refreshTokenTolerance = 30 * 1000; // Allow 30 second tolerance for processing time
  TestValidator.predicate(
    "refresh token expires in approximately 7 days",
    Math.abs(refreshTokenExpirationMs - sevenDaysMs) <= refreshTokenTolerance,
  );

  // Validate timestamp ISO 8601 format
  TestValidator.predicate(
    "expired_at is in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.refreshable_until),
  );

  // Validate contributor account timestamps
  TestValidator.predicate(
    "created_at timestamp is set",
    contributor.created_at !== null && contributor.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    contributor.updated_at !== null && contributor.updated_at !== undefined,
  );

  // Validate token expiration sequence (access token should expire before refresh token)
  TestValidator.predicate(
    "access token expires before refresh token",
    expiredAt < refreshableUntil,
  );
}
