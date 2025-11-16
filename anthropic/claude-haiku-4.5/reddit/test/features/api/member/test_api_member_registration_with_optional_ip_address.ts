import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member registration with optional IP address field.
 *
 * Verifies that the IP address field is truly optional and the system correctly
 * handles all variations: omitted, null, IPv4, and IPv6 addresses. Registration
 * should succeed regardless of how the IP field is handled, and the system
 * should properly initialize session tracking whether IP is provided or
 * extracted from the request context.
 *
 * Test scenarios:
 *
 * 1. Registration without IP field (omitted entirely)
 * 2. Registration with explicit null IP value
 * 3. Registration with valid IPv4 address
 * 4. Registration with valid IPv6 address
 *
 * Each registration creates a unique member account with proper token issuance
 * for immediate authenticated access.
 */
export async function test_api_member_registration_with_optional_ip_address(
  connection: api.IConnection,
) {
  // Test case 1: Registration without IP field (omitted)
  const email1 = typia.random<string & tags.Format<"email">>();
  const username1 = RandomGenerator.alphabets(10);
  const password1 = RandomGenerator.alphaNumeric(12);
  const href1 = typia.random<string & tags.Format<"uri">>();
  const referrer1 = typia.random<string & tags.Format<"uri">>();

  const createBody1 = {
    email: email1,
    username: username1,
    password: password1,
    href: href1,
    referrer: referrer1,
  } satisfies ICommunityPlatformMember.ICreate;

  const response1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createBody1,
    });
  typia.assert(response1);
  TestValidator.equals(
    "response should contain valid member id when IP is omitted",
    typeof response1.id,
    "string",
  );
  TestValidator.equals(
    "response should contain token with access property when IP is omitted",
    typeof response1.token.access,
    "string",
  );

  // Test case 2: Registration with explicit null IP value
  const email2 = typia.random<string & tags.Format<"email">>();
  const username2 = RandomGenerator.alphabets(10);
  const password2 = RandomGenerator.alphaNumeric(12);
  const href2 = typia.random<string & tags.Format<"uri">>();
  const referrer2 = typia.random<string & tags.Format<"uri">>();

  const createBody2 = {
    email: email2,
    username: username2,
    password: password2,
    ip: null,
    href: href2,
    referrer: referrer2,
  } satisfies ICommunityPlatformMember.ICreate;

  const response2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createBody2,
    });
  typia.assert(response2);
  TestValidator.equals(
    "response should contain valid member id when IP is null",
    typeof response2.id,
    "string",
  );
  TestValidator.predicate(
    "member IDs should be different between registrations",
    response2.id !== response1.id,
  );

  // Test case 3: Registration with valid IPv4 address
  const email3 = typia.random<string & tags.Format<"email">>();
  const username3 = RandomGenerator.alphabets(10);
  const password3 = RandomGenerator.alphaNumeric(12);
  const ipv4 = "192.168.1.100";
  const href3 = typia.random<string & tags.Format<"uri">>();
  const referrer3 = typia.random<string & tags.Format<"uri">>();

  const createBody3 = {
    email: email3,
    username: username3,
    password: password3,
    ip: ipv4,
    href: href3,
    referrer: referrer3,
  } satisfies ICommunityPlatformMember.ICreate;

  const response3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createBody3,
    });
  typia.assert(response3);
  TestValidator.equals(
    "response should contain valid member id when IPv4 is provided",
    typeof response3.id,
    "string",
  );
  TestValidator.predicate(
    "each registration should produce unique member ID",
    response3.id !== response1.id && response3.id !== response2.id,
  );

  // Test case 4: Registration with valid IPv6 address
  const email4 = typia.random<string & tags.Format<"email">>();
  const username4 = RandomGenerator.alphabets(10);
  const password4 = RandomGenerator.alphaNumeric(12);
  const ipv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
  const href4 = typia.random<string & tags.Format<"uri">>();
  const referrer4 = typia.random<string & tags.Format<"uri">>();

  const createBody4 = {
    email: email4,
    username: username4,
    password: password4,
    ip: ipv6,
    href: href4,
    referrer: referrer4,
  } satisfies ICommunityPlatformMember.ICreate;

  const response4: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createBody4,
    });
  typia.assert(response4);
  TestValidator.equals(
    "response should contain valid member id when IPv6 is provided",
    typeof response4.id,
    "string",
  );
  TestValidator.predicate(
    "all registrations should produce unique member IDs",
    response4.id !== response1.id &&
      response4.id !== response2.id &&
      response4.id !== response3.id,
  );

  // Validate token structure for all responses
  TestValidator.predicate(
    "access token should be non-empty string",
    response4.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    response4.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be a valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response4.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until should be a valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      response4.token.refreshable_until,
    ),
  );
}
