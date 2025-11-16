import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member login with URL format validation for href and referrer fields.
 *
 * Validates that the authentication system properly handles session context
 * URLs. The login endpoint requires both href (connection URL) and referrer
 * (previous page URL). This test verifies that:
 *
 * - Empty string referrer is accepted (edge case mentioned in spec)
 * - Valid URI formats for both href and referrer succeed in login
 *
 * Note: The DTO type system enforces URI format at compile-time through
 * tags.Format<"uri">, so invalid URI formats cannot be sent to the API. Focus
 * is on valid edge cases and success scenarios.
 */
export async function test_api_member_login_invalid_url_format(
  connection: api.IConnection,
) {
  // Generate valid credentials for login attempts
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(8);

  // Generate valid URIs for test cases
  const validHref = typia.random<string & tags.Format<"uri">>();
  const validReferrer = typia.random<string & tags.Format<"uri">>();

  // Test 1: Empty string referrer should be accepted
  // (empty string is valid per spec as alternative to valid URI)
  const emptyReferrerResult = await api.functional.auth.member.login(
    connection,
    {
      body: {
        email: email,
        password: password,
        href: validHref,
        referrer: "", // Empty string is valid according to spec
      } satisfies ICommunityPlatformMember.ILogin,
    },
  );
  typia.assert(emptyReferrerResult);
  TestValidator.predicate(
    "login with empty referrer should return authorized member",
    emptyReferrerResult.id !== undefined,
  );
  TestValidator.equals(
    "authorized member should have token information",
    typeof emptyReferrerResult.token.access,
    "string",
  );

  // Test 2: Both href and referrer with valid URI format should succeed
  const validLoginResult = await api.functional.auth.member.login(connection, {
    body: {
      email: email,
      password: password,
      href: validHref,
      referrer: validReferrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(validLoginResult);
  TestValidator.predicate(
    "login with valid URIs should return authorized member",
    validLoginResult.id !== undefined,
  );
  TestValidator.predicate(
    "authorized response should include valid access token",
    validLoginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorized response should include valid refresh token",
    validLoginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be in the future",
    new Date(validLoginResult.token.expired_at) > new Date(),
  );
}
