import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration with optional IP address field.
 *
 * This test validates the user registration endpoint's handling of the optional
 * IP address field. The test covers multiple scenarios:
 *
 * 1. Registration with a valid IPv4 address
 * 2. Registration with a valid IPv6 address
 * 3. Registration with null IP value
 * 4. Registration with IP field omitted (undefined)
 *
 * Each scenario verifies that:
 *
 * - User account is successfully created
 * - Authentication tokens (access and refresh) are properly issued
 * - User data matches the registration input
 * - All response fields conform to the expected types
 */
export async function test_api_user_registration_with_optional_ip(
  connection: api.IConnection,
) {
  // Test 1: Registration with IPv4 address
  const ipv4Email = typia.random<string & tags.Format<"email">>();
  const ipv4Password = RandomGenerator.alphaNumeric(12);
  const ipv4Href = typia.random<string & tags.Format<"uri">>();
  const ipv4Referrer = typia.random<string & tags.Format<"uri">>();

  const userWithIPv4 = await api.functional.auth.user.join(connection, {
    body: {
      email: ipv4Email,
      password: ipv4Password,
      ip: "192.168.1.100",
      href: ipv4Href,
      referrer: ipv4Referrer,
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(userWithIPv4);
  TestValidator.equals(
    "IPv4 user email matches",
    userWithIPv4.email,
    ipv4Email,
  );

  // Test 2: Registration with IPv6 address
  const ipv6Email = typia.random<string & tags.Format<"email">>();
  const ipv6Password = RandomGenerator.alphaNumeric(12);
  const ipv6Href = typia.random<string & tags.Format<"uri">>();
  const ipv6Referrer = typia.random<string & tags.Format<"uri">>();

  const userWithIPv6 = await api.functional.auth.user.join(connection, {
    body: {
      email: ipv6Email,
      password: ipv6Password,
      ip: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
      href: ipv6Href,
      referrer: ipv6Referrer,
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(userWithIPv6);
  TestValidator.equals(
    "IPv6 user email matches",
    userWithIPv6.email,
    ipv6Email,
  );

  // Test 3: Registration with null IP
  const nullIpEmail = typia.random<string & tags.Format<"email">>();
  const nullIpPassword = RandomGenerator.alphaNumeric(12);
  const nullIpHref = typia.random<string & tags.Format<"uri">>();
  const nullIpReferrer = typia.random<string & tags.Format<"uri">>();

  const userWithNullIP = await api.functional.auth.user.join(connection, {
    body: {
      email: nullIpEmail,
      password: nullIpPassword,
      ip: null,
      href: nullIpHref,
      referrer: nullIpReferrer,
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(userWithNullIP);
  TestValidator.equals(
    "Null IP user email matches",
    userWithNullIP.email,
    nullIpEmail,
  );

  // Test 4: Registration with IP field omitted
  const noIpEmail = typia.random<string & tags.Format<"email">>();
  const noIpPassword = RandomGenerator.alphaNumeric(12);
  const noIpHref = typia.random<string & tags.Format<"uri">>();
  const noIpReferrer = typia.random<string & tags.Format<"uri">>();

  const userWithoutIP = await api.functional.auth.user.join(connection, {
    body: {
      email: noIpEmail,
      password: noIpPassword,
      href: noIpHref,
      referrer: noIpReferrer,
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(userWithoutIP);
  TestValidator.equals(
    "No IP user email matches",
    userWithoutIP.email,
    noIpEmail,
  );
}
