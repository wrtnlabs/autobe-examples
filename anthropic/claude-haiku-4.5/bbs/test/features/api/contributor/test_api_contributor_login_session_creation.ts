import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test that successful login creates a session record with proper metadata.
 *
 * Validates the complete login workflow including session creation with proper
 * metadata (ip, href, referrer, login timestamp). Tests that multiple
 * concurrent sessions can exist for the same contributor by logging in from
 * different contexts.
 *
 * Process:
 *
 * 1. Register a new contributor account with email, username, and password
 * 2. Login with valid credentials and session context data
 * 3. Verify login response contains correct contributor info and JWT tokens
 * 4. Verify session is created with correct metadata (ip, href, referrer)
 * 5. Test multiple concurrent sessions for same contributor from different IPs
 */
export async function test_api_contributor_login_session_creation(
  connection: api.IConnection,
) {
  // 1. Register a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  // Generate password meeting requirements: 8+ chars with uppercase, lowercase, number, special char
  const password =
    RandomGenerator.alphabets(4).toUpperCase() +
    RandomGenerator.alphabets(4).toLowerCase() +
    RandomGenerator.pick([..."0123456789"]) +
    RandomGenerator.pick(["@", "#", "$", "%", "!"]);

  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ipAddress = "192.168.1.100";

  const registered = await api.functional.auth.contributor.join(connection, {
    body: {
      email,
      username,
      password,
      ip: ipAddress,
      href,
      referrer,
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(registered);

  TestValidator.equals(
    "registered contributor has correct email",
    registered.email,
    email,
  );
  TestValidator.equals(
    "registered contributor has correct username",
    registered.username,
    username,
  );
  TestValidator.predicate(
    "registered contributor has valid access token",
    registered.token.access.length > 0,
  );
  TestValidator.predicate(
    "registered contributor has valid refresh token",
    registered.token.refresh.length > 0,
  );

  // 2. Login with valid credentials and session context
  const loginResponse = await api.functional.auth.contributor.login(
    connection,
    {
      body: {
        email,
        password,
        ip: ipAddress,
        href,
        referrer,
      } satisfies IDiscussionBoardContributor.ILogin,
    },
  );
  typia.assert(loginResponse);

  TestValidator.equals(
    "login response has correct contributor id",
    loginResponse.id,
    registered.id,
  );
  TestValidator.equals(
    "login response has correct email",
    loginResponse.email,
    email,
  );
  TestValidator.equals(
    "login response has correct username",
    loginResponse.username,
    username,
  );
  TestValidator.predicate(
    "contributor account is active after login",
    loginResponse.account_status === "active",
  );
  TestValidator.predicate(
    "login response contains access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response contains refresh token",
    loginResponse.token.refresh.length > 0,
  );

  // 3. Test multiple concurrent sessions for same contributor
  // Create a second session from different IP/context
  const secondIp = "192.168.1.101";
  const secondHref = typia.random<string & tags.Format<"uri">>();
  const secondReferrer = typia.random<string & tags.Format<"uri">>();

  const secondLoginResponse = await api.functional.auth.contributor.login(
    connection,
    {
      body: {
        email,
        password,
        ip: secondIp,
        href: secondHref,
        referrer: secondReferrer,
      } satisfies IDiscussionBoardContributor.ILogin,
    },
  );
  typia.assert(secondLoginResponse);

  TestValidator.equals(
    "second login has same contributor id",
    secondLoginResponse.id,
    registered.id,
  );
  TestValidator.predicate(
    "second session has different context from first",
    secondLoginResponse.token.access !== loginResponse.token.access,
  );

  // 4. Test third concurrent session to validate multiple sessions support
  const thirdIp = "192.168.1.102";
  const thirdHref = typia.random<string & tags.Format<"uri">>();
  const thirdReferrer = typia.random<string & tags.Format<"uri">>();

  const thirdLoginResponse = await api.functional.auth.contributor.login(
    connection,
    {
      body: {
        email,
        password,
        ip: thirdIp,
        href: thirdHref,
        referrer: thirdReferrer,
      } satisfies IDiscussionBoardContributor.ILogin,
    },
  );
  typia.assert(thirdLoginResponse);

  TestValidator.equals(
    "third login has same contributor id",
    thirdLoginResponse.id,
    registered.id,
  );
  TestValidator.predicate(
    "third session is independent from first two",
    thirdLoginResponse.token.access !== loginResponse.token.access &&
      thirdLoginResponse.token.access !== secondLoginResponse.token.access,
  );
}
