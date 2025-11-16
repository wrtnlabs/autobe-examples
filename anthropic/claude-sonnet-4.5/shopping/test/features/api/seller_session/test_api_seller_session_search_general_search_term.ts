import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test general search functionality across multiple session fields as admin.
 *
 * This test validates that administrators can perform general searches across
 * seller authentication sessions using the search parameter. The general search
 * should match sessions based on partial text matching across IP addresses,
 * href URLs, and referrer URLs. The search must be case-insensitive and support
 * partial matching.
 *
 * Test workflow:
 *
 * 1. Create a seller account with distinctive session metadata (unique IP, href,
 *    referrer)
 * 2. Authenticate as admin to gain permission for session search operations
 * 3. Perform general search queries with terms matching different session fields
 * 4. Validate that sessions matching the search term in IP, href, or referrer are
 *    returned
 * 5. Verify case-insensitive and partial matching behavior
 * 6. Confirm that sessions not matching the search criteria are properly excluded
 * 7. Test search combined with pagination filters to ensure compatibility
 */
export async function test_api_seller_session_search_general_search_term(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with distinctive, searchable session metadata
  const uniqueIp = "192.168.100.50";
  const uniqueHref =
    "https://marketplace.example.com/seller/register/premium-plan";
  const uniqueReferrer = "https://marketing.campaign.example.com/seller-signup";

  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      ip: uniqueIp,
      href: uniqueHref,
      referrer: uniqueReferrer,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Authenticate as admin to perform session search operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/login",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Test general search with IP address fragment
  const ipSearchTerm = "168.100";
  const ipSearchResults =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: {
        search: ipSearchTerm,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(ipSearchResults);

  // Validate that search found sessions matching IP address
  TestValidator.predicate(
    "IP search should return results",
    ipSearchResults.data.length > 0,
  );

  // Verify the session contains the search term in IP field
  const matchingIpSession = ipSearchResults.data.find((session) =>
    session.ip.includes(ipSearchTerm),
  );
  TestValidator.predicate(
    "Found session should contain IP search term",
    matchingIpSession !== undefined,
  );

  // Step 4: Test general search with href URL fragment
  const hrefSearchTerm = "premium-plan";
  const hrefSearchResults =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: {
        search: hrefSearchTerm,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(hrefSearchResults);

  // Validate that search found sessions matching href URL
  TestValidator.predicate(
    "Href search should return results",
    hrefSearchResults.data.length > 0,
  );

  // Verify the session contains the search term in href field
  const matchingHrefSession = hrefSearchResults.data.find((session) =>
    session.href.includes(hrefSearchTerm),
  );
  TestValidator.predicate(
    "Found session should contain href search term",
    matchingHrefSession !== undefined,
  );

  // Step 5: Test general search with referrer URL fragment
  const referrerSearchTerm = "campaign";
  const referrerSearchResults =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: {
        search: referrerSearchTerm,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(referrerSearchResults);

  // Validate that search found sessions matching referrer URL
  TestValidator.predicate(
    "Referrer search should return results",
    referrerSearchResults.data.length > 0,
  );

  // Verify the session contains the search term in referrer field
  const matchingReferrerSession = referrerSearchResults.data.find((session) =>
    session.referrer.includes(referrerSearchTerm),
  );
  TestValidator.predicate(
    "Found session should contain referrer search term",
    matchingReferrerSession !== undefined,
  );

  // Step 6: Test case-insensitive search
  const caseInsensitiveSearchTerm = "PREMIUM";
  const caseInsensitiveResults =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: {
        search: caseInsensitiveSearchTerm,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(caseInsensitiveResults);

  // Validate case-insensitive search works
  TestValidator.predicate(
    "Case-insensitive search should return results",
    caseInsensitiveResults.data.length > 0,
  );

  // Step 7: Test search with non-matching term
  const nonMatchingTerm = "nonexistent-search-term-12345";
  const noMatchResults =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: {
        search: nonMatchingTerm,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(noMatchResults);

  // Validate that non-matching search returns no results
  TestValidator.equals(
    "Non-matching search should return empty results",
    noMatchResults.data.length,
    0,
  );

  // Step 8: Test search combined with pagination
  const paginatedSearchResults =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: {
        search: "example.com",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(paginatedSearchResults);

  // Validate pagination metadata is present and correct
  TestValidator.predicate(
    "Pagination should have correct page number",
    paginatedSearchResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pagination should have correct limit",
    paginatedSearchResults.pagination.limit === 5,
  );
}
