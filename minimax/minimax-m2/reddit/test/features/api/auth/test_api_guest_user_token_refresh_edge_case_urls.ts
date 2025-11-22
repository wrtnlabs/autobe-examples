import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IGuestSessionInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuestSessionInfo";
import type { IRedditPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestUser";

/**
 * Test guest user token refresh with edge case URL formats.
 *
 * This test validates the robustness of the guest user token refresh
 * functionality when handling various edge case URL formats. It creates a guest
 * session and then tests the refresh API with different URL formats including
 * complex query parameters, special characters, different protocol schemes, and
 * edge case scenarios.
 *
 * The test ensures that the refresh API can gracefully process diverse URL
 * structures while maintaining session security and providing continued
 * access.
 */
export async function test_api_guest_user_token_refresh_edge_case_urls(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session for testing
  const initialGuest: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        browsing_preferences: {
          interests: ["technology", "programming", "testing"],
          content_types: ["text", "link"],
        },
        ip_address: "192.168.1.100",
      } satisfies IRedditPlatformGuestUser.ICreate,
    });
  typia.assert(initialGuest);

  // Step 2: Test various edge case URL formats for refresh
  const edgeCaseUrls = [
    // Complex query parameters
    {
      name: "complex query parameters",
      href: "https://example.com/path?param1=value1&param2=value2&param3=value3&unicode=测试&special=%21%40%23%24",
      referrer: "https://google.com/search?q=test",
    },
    // URLs with fragments
    {
      name: "URL with fragment",
      href: "https://reddit.com/r/programming#hot",
      referrer: "https://reddit.com/",
    },
    // URLs with port numbers
    {
      name: "URL with custom port",
      href: "http://localhost:8080/api/guest?session=test123",
      referrer: "http://localhost:3000/landing",
    },
    // URLs with subdomain and special characters
    {
      name: "subdomain with special chars",
      href: "https://sub-domain_123.test-site.co.uk/path?filter=active&sort=desc",
      referrer: "https://main-site.com/referral",
    },
    // Very long URL with many parameters
    {
      name: "very long URL",
      href: `https://api.example.com/v1/users/profile?page=1&limit=50&sort=name&order=asc&filter=active&category=user&tags=tech,dev,testing&include=metadata,stats&exclude=sensitive&debug=true&version=2.0&timestamp=${Date.now()}`,
      referrer: "https://app.example.com/dashboard",
    },
    // URL with encoded characters
    {
      name: "URL with encoded characters",
      href: "https://example.com/search?q=café+résumé&category=français&author=Müller",
      referrer: "https://search.example.com/results",
    },
    // URL with different protocol
    {
      name: "FTP protocol URL",
      href: "ftp://files.example.com/downloads/resource.zip",
      referrer: "https://downloads.example.com/",
    },
    // URL with IP address and port
    {
      name: "IP address with port",
      href: "http://192.168.1.50:3000/api/guest/refresh?token=abc123",
      referrer: "http://192.168.1.50:3000/app",
    },
    // URL with subdomain numbers
    {
      name: "numeric subdomain",
      href: "https://api123.test-domain999.com/v2/endpoint?version=2024&format=json",
      referrer: "https://test-domain999.com/",
    },
    // URL with complex path structure
    {
      name: "complex path structure",
      href: "https://api.service.com/v1/users/12345/posts/commented/67890?action=reply&thread=main",
      referrer: "https://service.com/users/12345/posts",
    },
  ];

  // Step 3: Test each edge case URL format
  for (const urlTest of edgeCaseUrls) {
    // Test refresh with the edge case URL
    const refreshedGuest: IRedditPlatformGuestUser.IAuthorized =
      await api.functional.auth.guestUser.refresh(connection, {
        body: {
          href: urlTest.href satisfies string & tags.Format<"uri">,
          referrer: urlTest.referrer satisfies string & tags.Format<"uri">,
          ip_address: "192.168.1.100",
        } satisfies IRedditPlatformGuestUser.IRefresh,
      });
    typia.assert(refreshedGuest);

    // Validate that refresh was successful
    TestValidator.equals(
      `${urlTest.name}: should maintain session ID`,
      refreshedGuest.id,
      initialGuest.id,
    );

    TestValidator.equals(
      `${urlTest.name}: should have valid access token`,
      typeof refreshedGuest.token.access,
      "string",
    );

    TestValidator.equals(
      `${urlTest.name}: should have valid refresh token`,
      typeof refreshedGuest.token.refresh,
      "string",
    );

    TestValidator.predicate(
      `${urlTest.name}: access token should be different from initial`,
      refreshedGuest.token.access !== initialGuest.token.access,
    );

    TestValidator.predicate(
      `${urlTest.name}: session count should increment`,
      refreshedGuest.session_count === initialGuest.session_count + 1,
    );

    TestValidator.predicate(
      `${urlTest.name}: last activity should be updated`,
      new Date(refreshedGuest.last_activity) >
        new Date(initialGuest.last_activity),
    );

    // Update the initial guest for next iteration
    initialGuest.id = refreshedGuest.id;
    initialGuest.token = refreshedGuest.token;
    initialGuest.session_count = refreshedGuest.session_count;
    initialGuest.last_activity = refreshedGuest.last_activity;
  }

  // Step 4: Test edge case with empty referrer
  const emptyReferrerTest = await api.functional.auth.guestUser.refresh(
    connection,
    {
      body: {
        href: "https://direct.access.com/guest",
        referrer: "" satisfies string & tags.Format<"uri">, // Empty referrer as edge case
        ip_address: "192.168.1.100",
      } satisfies IRedditPlatformGuestUser.IRefresh,
    },
  );
  typia.assert(emptyReferrerTest);

  TestValidator.equals(
    "empty referrer: should still refresh successfully",
    emptyReferrerTest.token.access.length > 0,
    true,
  );

  // Step 5: Test without optional IP address
  const noIpTest = await api.functional.auth.guestUser.refresh(connection, {
    body: {
      href: "https://no-ip.example.com/access",
      referrer: "https://referrer.example.com/",
      // No ip_address provided - testing optional field
    } satisfies IRedditPlatformGuestUser.IRefresh,
  });
  typia.assert(noIpTest);

  TestValidator.equals(
    "no IP address: should still refresh successfully",
    noIpTest.token.access.length > 0,
    true,
  );
}
