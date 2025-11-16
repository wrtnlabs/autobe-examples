import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_authentication_login_case_sensitivity(
  connection: api.IConnection,
) {
  // Create a moderator with specific email and username casing
  const email = "TestUser@Example.COM";
  const username = "ModeratorName";
  const password = "SecurePassword123!";
  const testUrl = "https://example.com/auth/register";

  const createResponse = await api.functional.auth.moderator.join(connection, {
    body: {
      email: email,
      username: username,
      password: password,
      href: testUrl,
      referrer: testUrl,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(createResponse);
  typia.assert(createResponse.token);

  TestValidator.equals(
    "moderator email matches after creation",
    createResponse.email,
    email,
  );
  TestValidator.equals(
    "moderator username matches after creation",
    createResponse.username,
    username,
  );

  // Test 1: Login with lowercase email (should succeed - email is case-insensitive)
  const loginWithLowercaseEmail = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: email.toLowerCase(),
        password: password,
        href: testUrl,
        referrer: testUrl,
      } satisfies ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(loginWithLowercaseEmail);
  TestValidator.equals(
    "login with lowercase email succeeds",
    loginWithLowercaseEmail.id,
    createResponse.id,
  );

  // Test 2: Login with correct username casing (should succeed)
  const loginWithCorrectUsername = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        username: username,
        password: password,
        href: testUrl,
        referrer: testUrl,
      } satisfies ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(loginWithCorrectUsername);
  TestValidator.equals(
    "login with correct username succeeds",
    loginWithCorrectUsername.id,
    createResponse.id,
  );

  // Test 3: Login with different case username (should fail - username is case-sensitive)
  await TestValidator.error(
    "login with incorrect username casing should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          username: username.toLowerCase(),
          password: password,
          href: testUrl,
          referrer: testUrl,
        } satisfies ICommunityPlatformModerator.ILogin,
      });
    },
  );

  // Test 4: Login with mixed case email variation (should succeed - email is case-insensitive)
  const mixedCaseEmail = "testuser@example.com";
  const loginWithMixedCaseEmail = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: mixedCaseEmail,
        password: password,
        href: testUrl,
        referrer: testUrl,
      } satisfies ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(loginWithMixedCaseEmail);
  TestValidator.equals(
    "login with mixed case email succeeds",
    loginWithMixedCaseEmail.id,
    createResponse.id,
  );

  // Test 5: Verify case sensitivity with uppercase username variation (should fail)
  await TestValidator.error(
    "login with uppercase username should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          username: username.toUpperCase(),
          password: password,
          href: testUrl,
          referrer: testUrl,
        } satisfies ICommunityPlatformModerator.ILogin,
      });
    },
  );
}
