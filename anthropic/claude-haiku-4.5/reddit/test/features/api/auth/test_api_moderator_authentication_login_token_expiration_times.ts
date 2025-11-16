import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_authentication_login_token_expiration_times(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account via registration
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = "TestPassword123!";
  const href = "https://community.example.com/auth/register";
  const referrer = "https://community.example.com";

  const moderatorRegistration = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies ICommunityPlatformModerator.ICreate,
    },
  );
  typia.assert(moderatorRegistration);

  // Step 2: Verify registration returned valid tokens with expiration times
  TestValidator.predicate(
    "registration should return access token",
    moderatorRegistration.token.access.length > 0,
  );
  TestValidator.predicate(
    "registration should return refresh token",
    moderatorRegistration.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "registration should have expired_at timestamp",
    moderatorRegistration.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "registration should have refreshable_until timestamp",
    moderatorRegistration.token.refreshable_until.length > 0,
  );

  // Step 3: Login with the created moderator credentials
  const loginResponse = await api.functional.auth.moderator.login(connection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  typia.assert(loginResponse);

  // Step 4: Verify login response contains token expiration information
  TestValidator.predicate(
    "login should return access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login should return refresh token",
    loginResponse.token.refresh.length > 0,
  );

  // Step 5: Validate token expiration timestamps are in ISO 8601 format
  const expiredAtDate = new Date(loginResponse.token.expired_at);
  TestValidator.predicate(
    "expired_at should be valid ISO 8601 date",
    !isNaN(expiredAtDate.getTime()),
  );

  const refreshableUntilDate = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until should be valid ISO 8601 date",
    !isNaN(refreshableUntilDate.getTime()),
  );

  // Step 6: Verify expiration timestamp format matches ISO 8601 (RFC 3339)
  const iso8601Regex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;
  TestValidator.predicate(
    "expired_at should match ISO 8601 format",
    iso8601Regex.test(loginResponse.token.expired_at),
  );

  TestValidator.predicate(
    "refreshable_until should match ISO 8601 format",
    iso8601Regex.test(loginResponse.token.refreshable_until),
  );

  // Step 7: Validate token lifecycle - access token should expire before refresh token
  TestValidator.predicate(
    "access token should expire before refresh token can be renewed",
    expiredAtDate < refreshableUntilDate,
  );

  // Step 8: Verify typical token lifespans
  const now = new Date();
  const accessTokenLifespanMs = expiredAtDate.getTime() - now.getTime();
  const refreshTokenLifespanMs = refreshableUntilDate.getTime() - now.getTime();

  // Access token should be relatively short (typically 1 hour = 3600000 ms)
  const oneHourMs = 60 * 60 * 1000;
  TestValidator.predicate(
    "access token lifespan should be approximately 1 hour or less",
    accessTokenLifespanMs <= oneHourMs + 60000, // Allow 1 minute buffer
  );

  // Refresh token should be longer (typically 7 days = 604800000 ms)
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "refresh token lifespan should be approximately 7 days",
    refreshTokenLifespanMs >= sevenDaysMs - 60000, // Allow 1 minute buffer
  );

  // Step 9: Verify token structure contains all required fields
  TestValidator.predicate(
    "token should have access, refresh, expired_at, and refreshable_until fields",
    loginResponse.token.access !== undefined &&
      loginResponse.token.refresh !== undefined &&
      loginResponse.token.expired_at !== undefined &&
      loginResponse.token.refreshable_until !== undefined,
  );
}
