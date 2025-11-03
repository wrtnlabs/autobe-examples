import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";

export async function test_api_moderator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate realistic moderator registration data
  const username = `mod_${RandomGenerator.name(1)}${RandomGenerator.alphaNumeric(8)}`;
  const email = `moderator.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = `ModPass123`;

  // Step 2: Create new moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: username,
      email: email,
      password: password,
    } satisfies IPoliticsBbsModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Verify moderator profile was created successfully
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    username,
  );
  TestValidator.equals("moderator email matches", moderator.email, email);
  TestValidator.predicate(
    "moderator has valid ID",
    moderator.id !== null && moderator.id.length > 0,
  );

  // Step 4: Test login with username
  const loggedInModerator = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        username_or_email: username,
        password: password,
        href: "https://example.com/auth/moderator/login",
        referrer: "https://example.com/auth/moderator/register",
        ip: "192.168.1.100",
      } satisfies IPoliticsBbsModerator.ILogin,
    },
  );
  typia.assert(loggedInModerator);

  // Step 5: Verify successful login response
  TestValidator.equals(
    "logged in username matches",
    loggedInModerator.username,
    username,
  );
  TestValidator.equals(
    "logged in email matches",
    loggedInModerator.email,
    email,
  );
  TestValidator.equals(
    "logged in ID matches moderator ID",
    loggedInModerator.id,
    moderator.id,
  );

  // Step 6: Validate JWT tokens were issued
  TestValidator.predicate(
    "has access token",
    loggedInModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loggedInModerator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token not expired",
    new Date(loggedInModerator.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token valid",
    new Date(loggedInModerator.token.refreshable_until) > new Date(),
  );

  // Step 7: Test login with email instead of username
  const emailLoggedInModerator = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        username_or_email: email,
        password: password,
        href: "https://example.com/auth/moderator/login",
        referrer: "https://example.com/auth/moderator/login",
        ip: "192.168.1.101",
      } satisfies IPoliticsBbsModerator.ILogin,
    },
  );
  typia.assert(emailLoggedInModerator);

  // Step 8: Verify email login worked correctly
  TestValidator.equals(
    "email login username matches",
    emailLoggedInModerator.username,
    username,
  );
  TestValidator.equals(
    "email login email matches",
    emailLoggedInModerator.email,
    email,
  );
  TestValidator.equals(
    "email login ID matches moderator ID",
    emailLoggedInModerator.id,
    moderator.id,
  );

  // Step 9: Validate tokens are different but for same user
  TestValidator.notEquals(
    "access tokens are different",
    loggedInModerator.token.access,
    emailLoggedInModerator.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens are different",
    loggedInModerator.token.refresh,
    emailLoggedInModerator.token.refresh,
  );
  TestValidator.equals(
    "both authenticated same user",
    loggedInModerator.id,
    emailLoggedInModerator.id,
  );
}
