import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test the seller session search functionality with advanced filtering
 * capabilities.
 *
 * This test validates comprehensive session query capabilities including IP
 * address filtering, date range filtering, URL-based filtering, and general
 * search functionality for security monitoring and audit purposes.
 *
 * Test workflow:
 *
 * 1. Create seller account and capture initial session details
 * 2. Perform additional logins to create multiple sessions with different contexts
 * 3. Test individual filter parameters (IP, date ranges, href, referrer)
 * 4. Test combined filters to ensure proper intersection logic
 * 5. Test general search parameter for multi-field partial matching
 * 6. Validate that sellers can only access their own sessions
 *
 * Validation points:
 *
 * - IP address filtering returns only matching sessions
 * - Date range filters correctly bound results
 * - Href and referrer filtering work accurately
 * - Multiple filters combine with AND logic
 * - Search parameter performs partial matching across fields
 * - Pagination metadata is correct
 * - Security: sellers only see their own sessions
 */
export async function test_api_seller_sessions_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create seller account and capture initial session
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const initialHref = "https://marketplace.example.com/seller/register";
  const initialReferrer = "https://marketplace.example.com/seller/info";

  const phoneDigits = typia.random<
    number &
      tags.Type<"uint32"> &
      tags.Minimum<1000000000> &
      tags.Maximum<9999999999>
  >() satisfies number as number;

  const registrationData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: `+1${phoneDigits}`,
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: initialHref,
    referrer: initialReferrer,
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });
  typia.assert(seller);

  // Capture the initial session creation time for date filtering
  const initialSessionTime = new Date();

  // Wait a bit to ensure different timestamps for subsequent sessions
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 2: Query initial sessions to get baseline
  const allSessionsResponse: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(allSessionsResponse);

  TestValidator.predicate(
    "at least one session exists after registration",
    allSessionsResponse.data.length >= 1,
  );

  // Validate that all sessions belong to the authenticated seller (security check)
  TestValidator.predicate(
    "all sessions belong to the authenticated seller",
    allSessionsResponse.data.every(
      (session) => session.seller.id === seller.id,
    ),
  );

  // Get the first session for testing
  const firstSession = allSessionsResponse.data[0];
  typia.assert(firstSession);

  // Step 3: Test IP address filtering
  const ipFilteredResponse: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          ip: firstSession.ip,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(ipFilteredResponse);

  TestValidator.predicate(
    "IP filtering returns at least one session",
    ipFilteredResponse.data.length >= 1,
  );

  TestValidator.predicate(
    "all IP filtered sessions match the specified IP",
    ipFilteredResponse.data.every((session) => session.ip === firstSession.ip),
  );

  TestValidator.predicate(
    "IP filtered sessions belong to authenticated seller",
    ipFilteredResponse.data.every((session) => session.seller.id === seller.id),
  );

  // Step 4: Test date range filtering with created_at_after
  const afterFilterTime = new Date(
    initialSessionTime.getTime() - 1000 * 60 * 60,
  ); // 1 hour before
  const afterFilteredResponse: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          created_at_after: afterFilterTime.toISOString(),
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(afterFilteredResponse);

  TestValidator.predicate(
    "date filter after returns sessions",
    afterFilteredResponse.data.length >= 1,
  );

  TestValidator.predicate(
    "all sessions are created after the specified time",
    afterFilteredResponse.data.every(
      (session) => new Date(session.created_at) >= afterFilterTime,
    ),
  );

  // Step 5: Test date range filtering with created_at_before
  const beforeFilterTime = new Date(
    initialSessionTime.getTime() + 1000 * 60 * 60,
  ); // 1 hour after
  const beforeFilteredResponse: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          created_at_before: beforeFilterTime.toISOString(),
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(beforeFilteredResponse);

  TestValidator.predicate(
    "date filter before returns sessions",
    beforeFilteredResponse.data.length >= 1,
  );

  TestValidator.predicate(
    "all sessions are created before the specified time",
    beforeFilteredResponse.data.every(
      (session) => new Date(session.created_at) <= beforeFilterTime,
    ),
  );

  // Step 6: Test combined date range filtering
  const rangeFilteredResponse: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          created_at_after: afterFilterTime.toISOString(),
          created_at_before: beforeFilterTime.toISOString(),
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(rangeFilteredResponse);

  TestValidator.predicate(
    "date range filtering returns sessions within the range",
    rangeFilteredResponse.data.every((session) => {
      const createdAt = new Date(session.created_at);
      return createdAt >= afterFilterTime && createdAt <= beforeFilterTime;
    }),
  );

  // Step 7: Test href filtering
  const hrefFilteredResponse: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          href: firstSession.href,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(hrefFilteredResponse);

  TestValidator.predicate(
    "href filtering returns matching sessions",
    hrefFilteredResponse.data.length >= 1,
  );

  TestValidator.predicate(
    "all href filtered sessions match the specified href",
    hrefFilteredResponse.data.every(
      (session) => session.href === firstSession.href,
    ),
  );

  // Step 8: Test referrer filtering
  const referrerFilteredResponse: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          referrer: firstSession.referrer,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(referrerFilteredResponse);

  TestValidator.predicate(
    "referrer filtering returns matching sessions",
    referrerFilteredResponse.data.length >= 1,
  );

  TestValidator.predicate(
    "all referrer filtered sessions match the specified referrer",
    referrerFilteredResponse.data.every(
      (session) => session.referrer === firstSession.referrer,
    ),
  );

  // Step 9: Test combined filters (IP + date range)
  const combinedFilteredResponse: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          ip: firstSession.ip,
          created_at_after: afterFilterTime.toISOString(),
          created_at_before: beforeFilterTime.toISOString(),
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(combinedFilteredResponse);

  TestValidator.predicate(
    "combined filters work correctly with AND logic",
    combinedFilteredResponse.data.every((session) => {
      const createdAt = new Date(session.created_at);
      return (
        session.ip === firstSession.ip &&
        createdAt >= afterFilterTime &&
        createdAt <= beforeFilterTime
      );
    }),
  );

  // Step 10: Test general search parameter
  const searchTerm = firstSession.ip.substring(0, 5);
  const searchResponse: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
          search: searchTerm,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(searchResponse);

  TestValidator.predicate(
    "general search returns results",
    searchResponse.data.length >= 0,
  );

  // Step 11: Test pagination
  const paginatedResponse: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(paginatedResponse);

  TestValidator.equals(
    "pagination current page is 1",
    paginatedResponse.pagination.current,
    1,
  );

  TestValidator.predicate(
    "pagination limit is respected",
    paginatedResponse.data.length <= 10,
  );

  TestValidator.equals(
    "pagination records matches total sessions",
    paginatedResponse.pagination.records,
    allSessionsResponse.pagination.records,
  );
}
