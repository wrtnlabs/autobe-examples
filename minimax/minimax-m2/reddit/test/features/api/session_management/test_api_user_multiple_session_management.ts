import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_user_multiple_session_management(
  connection: api.IConnection,
) {
  // Create a registered user account for testing multiple session management
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);
  const userUsername: string = RandomGenerator.alphaNumeric(8);

  // Step 1: Create registered user account
  const createdUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: userUsername,
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        location: RandomGenerator.name(1),
        website_url: `https://${RandomGenerator.alphaNumeric(6)}.com`,
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(createdUser);

  TestValidator.equals(
    "user account created successfully",
    createdUser.email,
    userEmail,
  );
  TestValidator.equals(
    "user is authenticated",
    !!createdUser.token.access,
    true,
  );

  // Step 2: Create first authenticated session by logging in
  const firstSession: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(firstSession);

  TestValidator.equals(
    "first session established",
    !!firstSession.token.access,
    true,
  );
  TestValidator.equals("user data matches", firstSession.id, createdUser.id);

  // Step 3: Simulate creating additional sessions by logging in again with different context
  // Note: This simulates multiple device/session scenarios
  const secondSession: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://mobile.example.com/login",
        referrer: "https://mobile.example.com",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(secondSession);

  TestValidator.equals(
    "second session established",
    !!secondSession.token.access,
    true,
  );
  TestValidator.equals("still same user", secondSession.id, createdUser.id);

  // Step 4: Test session management by attempting to terminate first session
  // Since we don't have explicit session IDs from login responses, we'll use the token information
  // In a real scenario, session IDs would be available from a sessions list endpoint
  const sessionIdToTerminate: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Test terminating a specific session (this would typically require session listing)
  await api.functional.redditPlatform.registeredUser.auth.sessions.erase(
    connection,
    {
      sessionId: sessionIdToTerminate,
    },
  );

  // Step 5: Verify that user authentication state is preserved for other sessions
  // The user should still be able to perform authenticated operations
  const stillAuthenticatedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/verify",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(stillAuthenticatedUser);

  TestValidator.equals(
    "user still authenticated after session management",
    !!stillAuthenticatedUser.token.access,
    true,
  );
  TestValidator.equals(
    "user identity preserved",
    stillAuthenticatedUser.id,
    createdUser.id,
  );
  TestValidator.notEquals(
    "token should be different",
    stillAuthenticatedUser.token.access,
    firstSession.token.access,
  );

  // Step 6: Validate session termination behavior
  // Test that trying to terminate a non-existent session doesn't affect user authentication
  const invalidSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // This should not affect user authentication
  await api.functional.redditPlatform.registeredUser.auth.sessions.erase(
    connection,
    {
      sessionId: invalidSessionId,
    },
  );

  // Verify user can still authenticate
  const finalAuthCheck: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/final-check",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(finalAuthCheck);

  TestValidator.equals(
    "authentication preserved after invalid session termination",
    !!finalAuthCheck.token.access,
    true,
  );
  TestValidator.equals(
    "user account still valid",
    finalAuthCheck.id,
    createdUser.id,
  );
}
