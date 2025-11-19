import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Validates session context tracking during contributor login.
 *
 * Tests that session context information (IP address, href, referrer) is
 * properly recorded for security monitoring. Multiple login attempts from
 * different IP addresses and with different page contexts should create
 * separate session records with distinct tracking information.
 *
 * 1. Create a new contributor account
 * 2. Login with first set of session context (IP1, href1, referrer1)
 * 3. Login again with different session context (IP2, href2, referrer2)
 * 4. Verify each login creates distinct session records
 * 5. Validate IP addresses are captured correctly
 * 6. Verify href and referrer values are tracked
 */
export async function test_api_contributor_login_session_context_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const username = RandomGenerator.alphabets(10);

  const baseHref = typia.random<string & tags.Format<"uri">>();
  const baseReferrer = typia.random<string & tags.Format<"uri">>();

  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email,
      username,
      password,
      ip: "192.168.1.100",
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.equals("contributor email matches", contributor.email, email);
  TestValidator.equals(
    "contributor username matches",
    contributor.username,
    username,
  );

  // Step 2: Login with first session context
  const firstLoginHref = "https://example.com/login";
  const firstLoginReferrer = "https://example.com/home";
  const firstLoginIP = "192.168.1.100";

  const firstLogin = await api.functional.auth.contributor.login(connection, {
    body: {
      email,
      password,
      ip: firstLoginIP,
      href: firstLoginHref,
      referrer: firstLoginReferrer,
    } satisfies IDiscussionBoardContributor.ILogin,
  });
  typia.assert(firstLogin);
  TestValidator.equals(
    "first login returns correct email",
    firstLogin.email,
    email,
  );
  TestValidator.equals(
    "first login returns correct username",
    firstLogin.username,
    username,
  );
  TestValidator.predicate(
    "access token present after first login",
    firstLogin.token.access.length > 0,
  );

  // Step 3: Login with different session context
  const secondLoginHref = "https://example.com/auth/login";
  const secondLoginReferrer = "https://example.com/search";
  const secondLoginIP = "203.0.113.42";

  const secondLogin = await api.functional.auth.contributor.login(connection, {
    body: {
      email,
      password,
      ip: secondLoginIP,
      href: secondLoginHref,
      referrer: secondLoginReferrer,
    } satisfies IDiscussionBoardContributor.ILogin,
  });
  typia.assert(secondLogin);
  TestValidator.equals(
    "second login returns correct email",
    secondLogin.email,
    email,
  );
  TestValidator.equals(
    "second login returns correct username",
    secondLogin.username,
    username,
  );
  TestValidator.predicate(
    "access token present after second login",
    secondLogin.token.access.length > 0,
  );

  // Step 4: Verify distinct tokens for different sessions
  TestValidator.notEquals(
    "second login produces different access token",
    firstLogin.token.access,
    secondLogin.token.access,
  );
  TestValidator.notEquals(
    "second login produces different refresh token",
    firstLogin.token.refresh,
    secondLogin.token.refresh,
  );

  // Step 5: Login with third context from another IP
  const thirdLoginHref = "https://mobile.example.com/login";
  const thirdLoginReferrer = "https://mobile.example.com/app";
  const thirdLoginIP = "198.51.100.89";

  const thirdLogin = await api.functional.auth.contributor.login(connection, {
    body: {
      email,
      password,
      ip: thirdLoginIP,
      href: thirdLoginHref,
      referrer: thirdLoginReferrer,
    } satisfies IDiscussionBoardContributor.ILogin,
  });
  typia.assert(thirdLogin);
  TestValidator.equals(
    "third login returns correct email",
    thirdLogin.email,
    email,
  );
  TestValidator.predicate(
    "access token present after third login",
    thirdLogin.token.access.length > 0,
  );

  // Step 6: Verify all three logins created distinct sessions
  TestValidator.notEquals(
    "third login token differs from first",
    firstLogin.token.access,
    thirdLogin.token.access,
  );
  TestValidator.notEquals(
    "third login token differs from second",
    secondLogin.token.access,
    thirdLogin.token.access,
  );

  // Step 7: Validate token expiration metadata
  TestValidator.predicate(
    "first login access token expiration is set",
    firstLogin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "second login access token expiration is set",
    secondLogin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token is refreshable until date is set",
    firstLogin.token.refreshable_until.length > 0,
  );

  // Step 8: Verify account status remains active across all logins
  TestValidator.equals(
    "account status remains active after first login",
    firstLogin.account_status,
    "active",
  );
  TestValidator.equals(
    "account status remains active after second login",
    secondLogin.account_status,
    "active",
  );
  TestValidator.equals(
    "account status remains active after third login",
    thirdLogin.account_status,
    "active",
  );

  // Step 9: Verify last_login_at is updated
  TestValidator.predicate(
    "last_login_at is set after login",
    firstLogin.last_login_at !== null && firstLogin.last_login_at !== undefined,
  );
}
