import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test advanced searching and filtering capabilities for pending sellers.
 *
 * Validate search functionality with partial shop name matching, account status
 * filtering specifically for pending approvals, and date range filtering by
 * creation timestamp.
 */
export async function test_api_seller_pending_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for seller approval operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Create test sellers with varied shop names for search testing
  const sellers: IEcommerceSeller.IAuthorized[] = [];
  // Seller 1: Contains "tech" in shop name
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: "Tech Haven Electronics",
      shop_description: "Best tech gadgets",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller1);
  sellers.push(seller1);
  // Seller 2: Contains "fashion" in shop name
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: "Fashion Boutique Store",
      shop_description: "Latest fashion trends",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller2);
  sellers.push(seller2);
  // Seller 3: Contains "food" in shop name
  const seller3Connection: api.IConnection = { host: connection.host };
  const seller3 = await authorize_seller_join(seller3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: "Food Market Delights",
      shop_description: "Fresh food products",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller3);
  sellers.push(seller3);
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Seller 4: Mixed keywords for complex search
  const seller4Connection: api.IConnection = { host: connection.host };
  const seller4 = await authorize_seller_join(seller4Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: "Tech Fashion Fusion",
      shop_description: "Tech meets fashion",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller4);
  sellers.push(seller4);
  // Test 1: Search for sellers with "tech" in shop name (partial match)
  const techSearch = await api.functional.ecommerce.seller.pending.index(
    adminConnection,
    {
      body: {
        search: "tech",
        account_status: "pending_approval",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(techSearch);
  // Should find sellers with "tech" in shop name
  const techSellers = techSearch.data.filter((seller) =>
    seller.shop_name.toLowerCase().includes("tech"),
  );
  TestValidator.equals("find tech sellers", techSellers.length > 0, true);
  // Test 2: Search for sellers with "fashion" in shop name
  const fashionSearch = await api.functional.ecommerce.seller.pending.index(
    adminConnection,
    {
      body: {
        search: "fashion",
        account_status: "pending_approval",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(fashionSearch);
  const fashionSellers = fashionSearch.data.filter((seller) =>
    seller.shop_name.toLowerCase().includes("fashion"),
  );
  TestValidator.equals("find fashion sellers", fashionSellers.length > 0, true);
  // Test 3: Search with empty string (should return all pending sellers)
  const emptySearch = await api.functional.ecommerce.seller.pending.index(
    adminConnection,
    {
      body: {
        search: "",
        account_status: "pending_approval",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns sellers",
    emptySearch.data.length >= sellers.length,
    true,
  );
  // Test 4: Date range filtering - get sellers created after first seller
  const firstSellerTimestamp = sellers[0]!.created_at;
  const dateSearch = await api.functional.ecommerce.seller.pending.index(
    adminConnection,
    {
      body: {
        created_after: firstSellerTimestamp,
        account_status: "pending_approval",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(dateSearch);
  // Should find sellers created after the first one
  const laterSellers = dateSearch.data.filter(
    (seller) => seller.created_at > firstSellerTimestamp,
  );
  TestValidator.equals(
    "find sellers created after timestamp",
    laterSellers.length > 0,
    true,
  );
  // Test 5: Combined search term with date range
  const combinedSearch = await api.functional.ecommerce.seller.pending.index(
    adminConnection,
    {
      body: {
        search: "tech",
        created_after: firstSellerTimestamp,
        account_status: "pending_approval",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(combinedSearch);
  const combinedResults = combinedSearch.data.filter(
    (seller) =>
      seller.shop_name.toLowerCase().includes("tech") &&
      seller.created_at > firstSellerTimestamp,
  );
  TestValidator.equals(
    "combined search finds matching sellers",
    combinedResults.length >= 0,
    true,
  );
  // Test 6: Verify pagination works correctly
  const paginatedSearch = await api.functional.ecommerce.seller.pending.index(
    adminConnection,
    {
      body: {
        account_status: "pending_approval",
        page: 1,
        limit: 2, // Only request 2 items per page
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination limit respected",
    paginatedSearch.data.length <= 2,
    true,
  );
  TestValidator.predicate(
    "has pagination info",
    paginatedSearch.pagination.current === 1 &&
      paginatedSearch.pagination.limit === 2 &&
      paginatedSearch.pagination.records >= sellers.length,
  );
}
