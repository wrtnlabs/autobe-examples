import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBuyer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test admin's ability to search buyers by full name with partial matching.
 *
 * This test validates the buyer search functionality available to
 * administrators, focusing on partial name matching with case-insensitive text
 * search. It creates multiple buyer accounts with varied names and executes
 * different search patterns to ensure the search API correctly filters buyers
 * based on name criteria.
 *
 * The test verifies:
 *
 * 1. Admin authentication and authorization for buyer search operations
 * 2. Partial text matching in buyer full names (first name, last name, substrings)
 * 3. Case-insensitive search behavior
 * 4. Pagination functionality with configurable page and limit parameters
 * 5. Sorting capabilities (ascending/descending by full_name, email, created_at)
 * 6. Response structure conformance to IPageIShoppingMallBuyer.ISummary
 */
export async function test_api_buyer_search_with_name_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple buyer accounts with varied full names for testing
  const buyerNames = [
    "Alice Anderson",
    "Bob Builder",
    "Alice Brown",
    "Charlie Anderson",
    "David Chen",
    "Emma Wilson",
    "Frank Miller",
  ] as const;

  const buyers: IShoppingMallBuyer.IAuthorized[] = await ArrayUtil.asyncMap(
    buyerNames,
    async (fullName) => {
      const buyer = await api.functional.auth.buyer.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.MinLength<8>>(),
          full_name: fullName,
          phone_number: RandomGenerator.mobile(),
          ip: "127.0.0.1",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallBuyer.ICreate,
      });
      typia.assert(buyer);
      return buyer;
    },
  );

  // Step 3: Test partial name search - search for "Alice"
  const aliceSearchResult: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        search: "Alice",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(aliceSearchResult);

  // Validate search results contain "Alice" in full_name
  TestValidator.predicate(
    "search for 'Alice' should return buyers with Alice in name",
    aliceSearchResult.data.every((buyer) => buyer.full_name.includes("Alice")),
  );

  TestValidator.predicate(
    "search for 'Alice' should return 2 buyers",
    aliceSearchResult.data.length === 2,
  );

  // Step 4: Test partial name search - search for "Anderson"
  const andersonSearchResult: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        search: "Anderson",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(andersonSearchResult);

  TestValidator.predicate(
    "search for 'Anderson' should return buyers with Anderson in name",
    andersonSearchResult.data.every((buyer) =>
      buyer.full_name.includes("Anderson"),
    ),
  );

  TestValidator.predicate(
    "search for 'Anderson' should return 2 buyers",
    andersonSearchResult.data.length === 2,
  );

  // Step 5: Test case-insensitive search - search for "alice" (lowercase)
  const lowercaseSearchResult: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        search: "alice",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(lowercaseSearchResult);

  TestValidator.predicate(
    "case-insensitive search for 'alice' should find Alice buyers",
    lowercaseSearchResult.data.length === 2,
  );

  TestValidator.predicate(
    "lowercase search should match uppercase names",
    lowercaseSearchResult.data.every((buyer) =>
      buyer.full_name.toLowerCase().includes("alice"),
    ),
  );

  // Step 6: Test pagination - limit results to 3 per page
  const paginatedResult: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        page: 1,
        limit: 3,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedResult.data.length <= 3,
  );

  TestValidator.predicate(
    "pagination metadata should indicate current page is 1",
    paginatedResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match requested limit",
    paginatedResult.pagination.limit === 3,
  );

  // Step 7: Test sorting - ascending by full_name
  const ascendingSortResult: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        page: 1,
        limit: 10,
        orderBy: "full_name",
        sort: "asc",
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(ascendingSortResult);

  // Verify ascending order
  if (ascendingSortResult.data.length > 1) {
    for (let i = 0; i < ascendingSortResult.data.length - 1; i++) {
      TestValidator.predicate(
        "buyers should be sorted in ascending order by full_name",
        ascendingSortResult.data[i].full_name <=
          ascendingSortResult.data[i + 1].full_name,
      );
    }
  }

  // Step 8: Test sorting - descending by full_name
  const descendingSortResult: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        page: 1,
        limit: 10,
        orderBy: "full_name",
        sort: "desc",
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(descendingSortResult);

  // Verify descending order
  if (descendingSortResult.data.length > 1) {
    for (let i = 0; i < descendingSortResult.data.length - 1; i++) {
      TestValidator.predicate(
        "buyers should be sorted in descending order by full_name",
        descendingSortResult.data[i].full_name >=
          descendingSortResult.data[i + 1].full_name,
      );
    }
  }
}
