import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator login with an account that has not yet verified their email
 * address.
 *
 * This test validates the system's behavior when a moderator attempts to
 * authenticate with credentials from an account that has not completed email
 * verification. It creates a moderator account through registration, then
 * attempts login with unverified email status to confirm proper handling of
 * email verification requirements.
 *
 * Test flow:
 *
 * 1. Create a moderator account via join endpoint
 * 2. Verify the created account has email_verified=false
 * 3. Attempt to login with the created credentials
 * 4. Validate the login response shows email_verified is still false
 * 5. Confirm authentication tokens are properly issued for unverified accounts
 * 6. Verify the moderator account properties are correctly returned
 */
export async function test_api_moderator_authentication_login_email_not_verified(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account without email verification
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword =
    RandomGenerator.alphabets(4) +
    RandomGenerator.alphaNumeric(4).toUpperCase() +
    "1!";
  const currentUrl = "https://example.com/auth/register";
  const referrerUrl = "https://example.com/home";

  const joinResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: currentUrl,
        referrer: referrerUrl,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Verify the join response shows account is created but email not yet verified
  TestValidator.equals(
    "newly created account has email_verified=false",
    joinResponse.email_verified,
    false,
  );
  TestValidator.equals(
    "created account email matches input",
    joinResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "created account username matches input",
    joinResponse.username,
    moderatorUsername,
  );

  // Step 3: Attempt login with the unverified email account credentials
  const loginResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: currentUrl,
        referrer: referrerUrl,
      } satisfies ICommunityPlatformModerator.ILogin,
    });
  typia.assert(loginResponse);

  // Step 4: Verify login response shows same account with unverified email status
  TestValidator.equals(
    "login response id matches created moderator",
    loginResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "login response email matches created moderator",
    loginResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "login response username matches created moderator",
    loginResponse.username,
    moderatorUsername,
  );

  // Step 5: Verify email_verified remains false after login
  TestValidator.equals(
    "email_verified flag remains false for unverified email",
    loginResponse.email_verified,
    false,
  );

  // Step 6: Validate authentication tokens are present and populated
  TestValidator.predicate(
    "login response contains valid access token",
    loginResponse.token.access !== undefined &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response contains valid refresh token",
    loginResponse.token.refresh !== undefined &&
      loginResponse.token.refresh.length > 0,
  );

  // Step 7: Validate token expiration timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "access token expired_at is valid ISO date-time",
    () => {
      const expiredDate = new Date(loginResponse.token.expired_at);
      return !isNaN(expiredDate.getTime());
    },
  );

  TestValidator.predicate(
    "refresh token refreshable_until is valid ISO date-time",
    () => {
      const refreshableDate = new Date(loginResponse.token.refreshable_until);
      return !isNaN(refreshableDate.getTime());
    },
  );

  // Step 8: Validate account status and properties
  TestValidator.equals(
    "account status is active",
    loginResponse.account_status,
    "active",
  );

  TestValidator.predicate(
    "karma score is non-negative integer",
    loginResponse.karma_score >= 0,
  );

  // Step 9: Validate created_at timestamp is valid ISO date-time
  TestValidator.predicate("created_at is valid ISO date-time", () => {
    const createdDate = new Date(loginResponse.created_at);
    return !isNaN(createdDate.getTime());
  });

  // Step 10: Validate updated_at timestamp is valid ISO date-time
  TestValidator.predicate("updated_at is valid ISO date-time", () => {
    const updatedDate = new Date(loginResponse.updated_at);
    return !isNaN(updatedDate.getTime());
  });

  // Step 11: Verify deleted_at is null or undefined for active account
  TestValidator.predicate(
    "deleted_at is null for active account",
    loginResponse.deleted_at === null || loginResponse.deleted_at === undefined,
  );

  // Step 12: Confirm token issuance despite unverified email
  TestValidator.predicate(
    "authentication tokens issued even with unverified email",
    loginResponse.token.access.length > 0 &&
      loginResponse.token.refresh.length > 0 &&
      loginResponse.email_verified === false,
  );
}
