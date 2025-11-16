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
 * Test pagination functionality when searching seller authentication sessions
 * as admin.
 *
 * This test validates that the seller session search API correctly implements
 * pagination by creating multiple authentication sessions and testing various
 * page retrieval scenarios. It verifies that pagination metadata is accurate,
 * pages contain the correct number of records, and sort order is maintained
 * consistently across pages.
 *
 * Test workflow:
 *
 * 1. Create admin account for authentication
 * 2. Create seller account to generate initial session
 * 3. Generate 17 additional sessions by calling join endpoint with different
 *    IPs/URLs
 * 4. Test first page with limit 5 (should have 5 records)
 * 5. Test middle page (page 2) with limit 5 (should have 5 records)
 * 6. Test last page (page 4) with limit 5 (should have 3 records)
 * 7. Validate pagination metadata accuracy across all requests
 * 8. Verify consistent sort order using '-created_at'
 * 9. Test with different limit value (limit 10)
 */
export async function test_api_seller_session_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/home",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create seller account (creates first session)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";
  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    ip: "192.168.1.1",
    href: "https://seller.example.com/register",
    referrer: "https://seller.example.com/info",
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 3: Generate 17 additional sessions (total 18 sessions)
  // Note: Using join endpoint as workaround since no login endpoint is available
  const sessionCount = 18;

  for (let i = 0; i < sessionCount - 1; i++) {
    const sessionData = {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      ip: `192.168.1.${i + 2}`,
      href: `https://seller.example.com/session/${i}`,
      referrer: `https://seller.example.com/page/${i}`,
    } satisfies IShoppingMallSeller.ICreate;

    await api.functional.auth.seller.join(connection, {
      body: sessionData,
    });
  }

  // Step 4: Test first page (page 1, limit 5)
  const firstPageRequest = {
    page: 1,
    limit: 5,
    sort: ["-created_at"],
    shopping_mall_seller_id: seller.id,
  } satisfies IShoppingMallSellerSession.IRequest;

  const firstPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: firstPageRequest,
    });
  typia.assert(firstPage);

  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.equals(
    "first page records",
    firstPage.pagination.records,
    sessionCount,
  );
  TestValidator.equals("first page pages", firstPage.pagination.pages, 4);
  TestValidator.equals("first page data count", firstPage.data.length, 5);

  // Step 5: Test middle page (page 2, limit 5)
  const middlePageRequest = {
    page: 2,
    limit: 5,
    sort: ["-created_at"],
    shopping_mall_seller_id: seller.id,
  } satisfies IShoppingMallSellerSession.IRequest;

  const middlePage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: middlePageRequest,
    });
  typia.assert(middlePage);

  TestValidator.equals("middle page current", middlePage.pagination.current, 2);
  TestValidator.equals("middle page limit", middlePage.pagination.limit, 5);
  TestValidator.equals(
    "middle page records",
    middlePage.pagination.records,
    sessionCount,
  );
  TestValidator.equals("middle page pages", middlePage.pagination.pages, 4);
  TestValidator.equals("middle page data count", middlePage.data.length, 5);

  // Step 6: Test last page (page 4, limit 5) - should have 3 records
  const lastPageRequest = {
    page: 4,
    limit: 5,
    sort: ["-created_at"],
    shopping_mall_seller_id: seller.id,
  } satisfies IShoppingMallSellerSession.IRequest;

  const lastPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: lastPageRequest,
    });
  typia.assert(lastPage);

  TestValidator.equals("last page current", lastPage.pagination.current, 4);
  TestValidator.equals("last page limit", lastPage.pagination.limit, 5);
  TestValidator.equals(
    "last page records",
    lastPage.pagination.records,
    sessionCount,
  );
  TestValidator.equals("last page pages", lastPage.pagination.pages, 4);
  TestValidator.equals("last page data count", lastPage.data.length, 3);

  // Step 7: Verify sort order consistency (newest first with -created_at)
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    const current = new Date(firstPage.data[i].created_at).getTime();
    const next = new Date(firstPage.data[i + 1].created_at).getTime();
    TestValidator.predicate("first page sort order", current >= next);
  }

  // Step 8: Test with different limit value (limit 10)
  const largeLimitRequest = {
    page: 1,
    limit: 10,
    sort: ["-created_at"],
    shopping_mall_seller_id: seller.id,
  } satisfies IShoppingMallSellerSession.IRequest;

  const largeLimitPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: largeLimitRequest,
    });
  typia.assert(largeLimitPage);

  TestValidator.equals(
    "large limit page current",
    largeLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "large limit page limit",
    largeLimitPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "large limit page records",
    largeLimitPage.pagination.records,
    sessionCount,
  );
  TestValidator.equals(
    "large limit page pages",
    largeLimitPage.pagination.pages,
    2,
  );
  TestValidator.equals(
    "large limit page data count",
    largeLimitPage.data.length,
    10,
  );
}
