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
 * Test administrator's ability to search and retrieve seller authentication
 * sessions.
 *
 * This test validates that administrators can search seller sessions with
 * comprehensive filtering and pagination capabilities. The test creates a
 * seller account to generate authentication sessions, then authenticates as
 * admin and searches for those sessions using various filter criteria.
 *
 * Test workflow:
 *
 * 1. Create a seller account (generates initial session)
 * 2. Create and authenticate as admin
 * 3. Search for seller sessions by seller ID
 * 4. Validate pagination metadata (current, limit, records, pages)
 * 5. Validate session summary data (IP, timestamps, seller info, expired_at)
 * 6. Test filtering and sorting capabilities
 */
export async function test_api_seller_session_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create seller account to generate authentication session
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 10 }),
        store_name: RandomGenerator.name(2),
        href: "https://marketplace.example.com/seller/register",
        referrer: "https://marketplace.example.com/seller/info",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: "https://marketplace.example.com/admin/register",
        referrer: "https://marketplace.example.com/admin/login",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Search for seller sessions by seller ID with pagination
  const searchResult: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);

  TestValidator.predicate(
    "should have at least one session record",
    searchResult.pagination.records >= 1,
  );

  TestValidator.predicate(
    "should have at least one page",
    searchResult.pagination.pages >= 1,
  );

  // Step 5: Validate session data exists
  TestValidator.predicate(
    "should return at least one session",
    searchResult.data.length >= 1,
  );

  // Step 6: Validate session summary structure and content
  const firstSession = searchResult.data[0];
  typia.assert(firstSession);

  TestValidator.equals(
    "session seller ID matches created seller",
    firstSession.seller.id,
    seller.id,
  );

  TestValidator.equals(
    "session seller email matches",
    firstSession.seller.email,
    seller.email,
  );

  TestValidator.equals(
    "session seller store_name matches",
    firstSession.seller.store_name,
    seller.store_name,
  );

  TestValidator.predicate(
    "session IP should be non-empty string",
    typeof firstSession.ip === "string" && firstSession.ip.length > 0,
  );

  TestValidator.predicate(
    "session href should be non-empty string",
    typeof firstSession.href === "string" && firstSession.href.length > 0,
  );

  TestValidator.predicate(
    "session referrer should be non-empty string",
    typeof firstSession.referrer === "string" &&
      firstSession.referrer.length > 0,
  );

  TestValidator.predicate(
    "session created_at should be valid date-time string",
    typeof firstSession.created_at === "string" &&
      firstSession.created_at.length > 0,
  );

  // Step 7: Test sorting by creation date descending
  const sortedDescResult: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 10,
        sort: ["-created_at"],
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(sortedDescResult);

  TestValidator.predicate(
    "sorted descending result should have data",
    sortedDescResult.data.length >= 1,
  );

  // Step 8: Test sorting by creation date ascending
  const sortedAscResult: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 10,
        sort: ["+created_at"],
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(sortedAscResult);

  TestValidator.predicate(
    "sorted ascending result should have data",
    sortedAscResult.data.length >= 1,
  );
}
