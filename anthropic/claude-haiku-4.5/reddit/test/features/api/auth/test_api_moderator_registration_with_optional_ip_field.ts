import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validates moderator registration with various configurations of the optional
 * IP field.
 *
 * Tests that moderator registration succeeds when the IP field is:
 *
 * 1. Provided with a valid IPv4 address
 * 2. Provided with a valid IPv6 address
 * 3. Explicitly set to null
 * 4. Omitted entirely from the request
 *
 * This ensures the optional IP field does not block registration and the server
 * properly handles SSR scenarios where client IP might not be accessible.
 *
 * Steps:
 *
 * 1. Register moderator with IPv4 address and verify successful response
 * 2. Register moderator with IPv6 address and verify successful response
 * 3. Register moderator with null IP and verify successful response
 * 4. Register moderator without IP field and verify successful response
 * 5. Validate all responses contain proper authentication tokens
 */
export async function test_api_moderator_registration_with_optional_ip_field(
  connection: api.IConnection,
) {
  // Test 1: Registration with IPv4 address
  const ipv4Moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(12),
      ip: "192.168.1.1",
      href: "https://example.com/auth/register",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(ipv4Moderator);
  TestValidator.predicate(
    "IPv4 registration successful",
    ipv4Moderator.id !== undefined,
  );
  TestValidator.predicate(
    "IPv4 response has access token",
    ipv4Moderator.token.access !== undefined,
  );
  TestValidator.predicate(
    "IPv4 response has refresh token",
    ipv4Moderator.token.refresh !== undefined,
  );

  // Test 2: Registration with IPv6 address
  const ipv6Moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(12),
      ip: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
      href: "https://example.com/auth/register",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(ipv6Moderator);
  TestValidator.predicate(
    "IPv6 registration successful",
    ipv6Moderator.id !== undefined,
  );
  TestValidator.predicate(
    "IPv6 response has access token",
    ipv6Moderator.token.access !== undefined,
  );

  // Test 3: Registration with null IP
  const nullIpModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: "https://example.com/auth/register",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(nullIpModerator);
  TestValidator.predicate(
    "Null IP registration successful",
    nullIpModerator.id !== undefined,
  );
  TestValidator.predicate(
    "Null IP response has access token",
    nullIpModerator.token.access !== undefined,
  );

  // Test 4: Registration without IP field (omitted entirely)
  const noIpModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/auth/register",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(noIpModerator);
  TestValidator.predicate(
    "No IP field registration successful",
    noIpModerator.id !== undefined,
  );
  TestValidator.predicate(
    "No IP field response has access token",
    noIpModerator.token.access !== undefined,
  );
  TestValidator.predicate(
    "No IP field response has refresh token",
    noIpModerator.token.refresh !== undefined,
  );

  // Validate all registrations are distinct
  TestValidator.notEquals(
    "IPv4 and IPv6 moderators are different",
    ipv4Moderator.id,
    ipv6Moderator.id,
  );
  TestValidator.notEquals(
    "IPv4 and null IP moderators are different",
    ipv4Moderator.id,
    nullIpModerator.id,
  );
  TestValidator.notEquals(
    "IPv6 and no IP moderators are different",
    ipv6Moderator.id,
    noIpModerator.id,
  );

  // Validate email verification status for all
  TestValidator.predicate(
    "IPv4 moderator email not verified on creation",
    ipv4Moderator.email_verified === false,
  );
  TestValidator.predicate(
    "IPv6 moderator email not verified on creation",
    ipv6Moderator.email_verified === false,
  );
  TestValidator.predicate(
    "Null IP moderator email not verified on creation",
    nullIpModerator.email_verified === false,
  );
  TestValidator.predicate(
    "No IP moderator email not verified on creation",
    noIpModerator.email_verified === false,
  );

  // Validate all have active account status
  TestValidator.equals(
    "IPv4 moderator has active status",
    ipv4Moderator.account_status,
    "active",
  );
  TestValidator.equals(
    "IPv6 moderator has active status",
    ipv6Moderator.account_status,
    "active",
  );
  TestValidator.equals(
    "Null IP moderator has active status",
    nullIpModerator.account_status,
    "active",
  );
  TestValidator.equals(
    "No IP moderator has active status",
    noIpModerator.account_status,
    "active",
  );
}
