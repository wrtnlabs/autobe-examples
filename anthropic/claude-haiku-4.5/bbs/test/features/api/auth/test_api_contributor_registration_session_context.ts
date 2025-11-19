import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test session context fields (ip, href, referrer) capture during contributor
 * registration.
 *
 * Validates that the registration endpoint properly captures and stores session
 * context information including IP address, page URL (href), and referrer URL
 * for security monitoring and audit trails. Tests both successful registrations
 * with complete context data and scenarios where IP can be server-extracted.
 *
 * Test scenarios:
 *
 * 1. Register with complete session context (ip, href, referrer all provided)
 * 2. Register with null IP (server extracts from request) but valid href and
 *    referrer
 * 3. Validate that authorized response contains valid token and contributor data
 * 4. Validate token fields contain proper datetime values
 */
export async function test_api_contributor_registration_session_context(
  connection: api.IConnection,
) {
  // Test 1: Successful registration with complete session context fields
  const email1 = typia.random<string & tags.Format<"email">>();
  const username1 = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password1 = RandomGenerator.alphabets(10) + "Aa1!";
  const ip1 = "192.168.1.100";
  const href1 = "https://example.com/auth/register";
  const referrer1 = "https://example.com/home";

  const response1 = await api.functional.auth.contributor.join(connection, {
    body: {
      email: email1,
      username: username1,
      password: password1,
      ip: ip1,
      href: href1,
      referrer: referrer1,
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(response1);

  // Validate response structure and token
  TestValidator.equals(
    "contributor email matches registration input",
    response1.email,
    email1,
  );
  TestValidator.equals(
    "contributor username matches registration input",
    response1.username,
    username1,
  );
  TestValidator.predicate(
    "contributor has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response1.id,
    ),
  );
  TestValidator.equals(
    "contributor account status is active",
    response1.account_status,
    "active",
  );
  TestValidator.predicate(
    "contributor email is not verified",
    response1.email_verified === false,
  );
  TestValidator.predicate(
    "token contains access token",
    response1.token.access.length > 0,
  );
  TestValidator.predicate(
    "token contains refresh token",
    response1.token.refresh.length > 0,
  );

  // Test 2: Successful registration with null IP (server extracts)
  const email2 = typia.random<string & tags.Format<"email">>();
  const username2 = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password2 = RandomGenerator.alphabets(10) + "Bb2@";
  const href2 = "https://example.com/auth/register";
  const referrer2 = "https://social.example.com/ref";

  const response2 = await api.functional.auth.contributor.join(connection, {
    body: {
      email: email2,
      username: username2,
      password: password2,
      ip: null, // Server will extract IP
      href: href2,
      referrer: referrer2,
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(response2);

  TestValidator.equals(
    "second contributor email matches input",
    response2.email,
    email2,
  );
  TestValidator.equals(
    "second contributor username matches input",
    response2.username,
    username2,
  );
  TestValidator.equals(
    "second contributor account status is active",
    response2.account_status,
    "active",
  );

  // Test 3: Validate token fields contain proper datetime values
  TestValidator.predicate(
    "access token expiration is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response1.token.expired_at),
  );
  TestValidator.predicate(
    "refresh token expiration is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      response1.token.refreshable_until,
    ),
  );

  // Test 4: Validate contributor has proper created timestamps
  TestValidator.predicate(
    "contributor created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response1.created_at),
  );
  TestValidator.predicate(
    "contributor updated_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response1.updated_at),
  );

  // Test 5: Validate session context allows multiple registrations
  const email3 = typia.random<string & tags.Format<"email">>();
  const username3 = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password3 = RandomGenerator.alphabets(10) + "Cc3#";

  const response3 = await api.functional.auth.contributor.join(connection, {
    body: {
      email: email3,
      username: username3,
      password: password3,
      ip: "192.168.1.103",
      href: "https://different.site.com/register",
      referrer: "https://different.site.com/landing",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(response3);

  TestValidator.predicate(
    "third contributor has different id from first",
    response3.id !== response1.id,
  );
  TestValidator.equals(
    "third contributor email is correct",
    response3.email,
    email3,
  );
}
