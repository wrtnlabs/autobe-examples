import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test guest registration with URI format validation focusing on business
 * scenarios.
 *
 * Tests various valid URI formats to ensure proper functioning of the guest
 * registration system through different common URL patterns used in
 * production:
 *
 * 1. Standard HTTP/HTTPS URLs
 * 2. URLs with different path structures
 * 3. URLs with query parameters
 * 4. URLs with port numbers
 * 5. Business-referral scenarios
 *
 * Validates successful guest session creation with proper URI handling for
 * real-world e-commerce scenarios rather than testing type validation.
 */
export async function test_api_guest_registration_invalid_uri_formats(
  connection: api.IConnection,
) {
  // Test Case 1: Standard HTTPS URL (most common scenario)
  const equipsHttpsData = {
    href: "https://shoppingmall.example.com/products/electronics",
    referrer: "https://google.com/search?q=electronics+shopping",
    session_id: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<64>
    >(),
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  const httpsGuest = await api.functional.auth.guest.join(connection, {
    body: equipsHttpsData,
  });
  typia.assert(httpsGuest);
  TestValidator.equals(
    "HTTPS guest created successfully",
    httpsGuest.token.access.length > 0,
    true,
  );

  // Test Case 2: Standard HTTP URL (legacy compatibility)
  const httpData = {
    href: "http://m.example.com/shopping-cart",
    referrer: "http://facebook.com/advertisement",
    session_id: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<64>
    >(),
    user_agent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  const httpGuest = await api.functional.auth.guest.join(connection, {
    body: httpData,
  });
  typia.assert(httpGuest);
  TestValidator.equals(
    "HTTP guest created successfully",
    httpGuest.token.refresh.length > 0,
    true,
  );

  // Test Case 3: URL with query parameters (product page tracking)
  const queryParamData = {
    href: "https://shoppingmall.example.com/product?id=12345&ref=email&utm_campaign=spring_sale",
    referrer: "https://newsletter.example.com/march_2024",
    session_id: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<64>
    >(),
    user_agent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  const queryParamGuest = await api.functional.auth.guest.join(connection, {
    body: queryParamData,
  });
  typia.assert(queryParamGuest);
  TestValidator.equals(
    "Query parameter guest created successfully",
    typeof queryParamGuest.id,
    "string",
  );

  // Test Case 4: URL with non-standard port (development/testing scenarios)
  const nonStandardPortData = {
    href: "https://staging.example.com:9443/app/dashboard",
    referrer: "https://internal.example.com:8080/analytics",
    session_id: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<64>
    >(),
    user_agent:
      "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  const nonStandardPortGuest = await api.functional.auth.guest.join(
    connection,
    {
      body: nonStandardPortData,
    },
  );
  typia.assert(nonStandardPortGuest);
  TestValidator.equals(
    "Non-standard port guest created successfully",
    nonStandardPortGuest.user_agent.length > 0,
    true,
  );

  // Test Case 5: Social media referrer (business-common scenario)
  const socialMediaData = {
    href: "https://shoppingmall.example.com/special-offers",
    referrer: "https://instagram.com/p/ABC123DEF/promotional-post",
    session_id: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<64>
    >(),
    user_agent:
      "Mozilla/5.0 (Android 11; Mobile; rv:109) Gecko/115.0 Firefox/115.0",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  const socialMediaGuest = await api.functional.auth.guest.join(connection, {
    body: socialMediaData,
  });
  typia.assert(socialMediaGuest);
  TestValidator.equals(
    "Social media referrer guest created successfully",
    socialMediaGuest.ip_address.length > 0,
    true,
  );

  // Test Case 6: Deep navigation path (user browsing session)
  const deepNavigationData = {
    href: "https://shoppingmall.example.com/us/electronics/computers/laptops/gaming-laptops/model-12345",
    referrer:
      "https://shoppingmall.example.com/us/electronics/computers/laptops",
    session_id: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<64>
    >(),
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edge/122.0.0.0",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  const deepNavigationGuest = await api.functional.auth.guest.join(connection, {
    body: deepNavigationData,
  });
  typia.assert(deepNavigationGuest);
  TestValidator.equals(
    "Deep navigation guest created successfully",
    deepNavigationGuest.session_id.length >= 10,
    true,
  );

  // Test Case 7: International domain (multi-language support)
  const internationalDomainData = {
    href: "https://شاهد.مثال.com/المنتجات",
    referrer: "https://搜尋.引擎.com/搜尋?q=產品",
    session_id: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<64>
    >(),
    user_agent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  const internationalDomainGuest = await api.functional.auth.guest.join(
    connection,
    {
      body: internationalDomainData,
    },
  );
  typia.assert(internationalDomainGuest);
  TestValidator.equals(
    "International domain guest created successfully",
    internationalDomainGuest.id.length > 0,
    true,
  );

  // Test Case 8: Search engine referrer (organic traffic)
  const searchEngineData = {
    href: "https://shoppingmall.example.com/category?brand=nike&size=10",
    referrer: "https://bing.com/images/search?q=nike+shoes+size+10&FORM=HDHDR",
    session_id: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<64>
    >(),
    user_agent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  await api.functional.auth.guest.join(connection, {
    body: searchEngineData,
  });

  // Additional validation: Ensure guest sessions have unique IDs
  const guestIds = [
    httpsGuest,
    httpGuest,
    queryParamGuest,
    nonStandardPortGuest,
    socialMediaGuest,
    deepNavigationGuest,
    internationalDomainGuest,
  ].map((g) => g.id);
  TestValidator.equals(
    "guest IDs are unique",
    Array.from(new Set(guestIds)).length,
    guestIds.length,
  );

  // Additional validation: Guest tokens are properly structured
  TestValidator.predicate(
    "HTTPS guest has valid token structure",
    httpsGuest.token.access.includes(".") &&
      httpsGuest.token.refresh.includes("."),
  );
  TestValidator.equals(
    "HTTP guest has valid session ID",
    httpGuest.session_id.length >= 10 && httpGuest.session_id.length <= 64,
    true,
  );
  TestValidator.equals(
    "Query parameter guest has valid IP address",
    queryParamGuest.ip_address,
    queryParamData.ip,
  );
  TestValidator.equals(
    "Non-standard port guest has valid timestamps",
    new Date(nonStandardPortGuest.token.expired_at).getTime() > Date.now(),
    true,
  );
}
