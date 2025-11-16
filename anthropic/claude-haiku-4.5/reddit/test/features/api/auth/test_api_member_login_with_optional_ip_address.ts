import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_login_with_optional_ip_address(
  connection: api.IConnection,
) {
  // Create a member account for login testing
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const createResponse = await api.functional.auth.member.join(connection, {
    body: {
      email,
      username: RandomGenerator.alphabets(8),
      password,
      href,
      referrer,
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(createResponse);

  // Test 1: Login with omitted IP field
  const loginWithoutIp = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginWithoutIp);
  TestValidator.predicate(
    "login without IP should succeed",
    loginWithoutIp.token !== undefined,
  );

  // Test 2: Login with explicit null IP
  const loginWithNullIp = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginWithNullIp);
  TestValidator.predicate(
    "login with null IP should succeed",
    loginWithNullIp.token !== undefined,
  );

  // Test 3: Login with IPv4 address
  const ipv4 = "192.168.0.1";
  const loginWithIpv4 = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
      ip: ipv4,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginWithIpv4);
  TestValidator.predicate(
    "login with IPv4 should succeed",
    loginWithIpv4.token !== undefined,
  );

  // Test 4: Login with IPv6 address
  const ipv6 = "2001:db8::1";
  const loginWithIpv6 = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
      ip: ipv6,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginWithIpv6);
  TestValidator.predicate(
    "login with IPv6 should succeed",
    loginWithIpv6.token !== undefined,
  );

  // Verify all responses have valid token structure
  TestValidator.equals(
    "IPv4 login has access token",
    loginWithIpv4.token.access !== undefined &&
      loginWithIpv4.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "IPv4 login has refresh token",
    loginWithIpv4.token.refresh !== undefined &&
      loginWithIpv4.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "IPv6 login has access token",
    loginWithIpv6.token.access !== undefined &&
      loginWithIpv6.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "IPv6 login has refresh token",
    loginWithIpv6.token.refresh !== undefined &&
      loginWithIpv6.token.refresh.length > 0,
    true,
  );
}
