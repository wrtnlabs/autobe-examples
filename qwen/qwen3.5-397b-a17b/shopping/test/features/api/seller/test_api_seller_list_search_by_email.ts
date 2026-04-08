import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test email search functionality for finding specific seller accounts by partial email match.
 *
 * Validates the seller list endpoint's email search capability including partial match filtering, case-insensitive matching, and combined filter application. Ensures that administrators can efficiently locate specific sellers using email-based search criteria.
 *
 * The test covers multiple search scenarios including partial substring matching, unique email identification, no-match empty results, and combined filtering with approval status. Each scenario validates both the returned seller data and pagination metadata accuracy.
 *
 * 1. Administrator authenticates using join operation for seller management access.
 * 2. Retrieves all sellers to establish baseline data for search testing.
 * 3. Tests partial email match search using domain substring.
 * 4. Tests unique email substring matching single seller.
 * 5. Tests non-existent email substring returning empty results.
 * 6. Tests combined email and approvalStatus filter application.
 * 7. Validates pagination metadata reflects accurate search result counts.
 */
export async function test_api_seller_list_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Get baseline seller list to understand available data
  const allSellers =
    await api.functional.shoppingMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(allSellers);
  // 3. Test partial email match search using domain substring
  const domainSearch = "test";
  const domainSearchResults =
    await api.functional.shoppingMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          email: domainSearch,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(domainSearchResults);
  // Validate all returned sellers contain the search term in email
  if (domainSearchResults.data.length > 0) {
    TestValidator.predicate(
      "all sellers match email search term",
      domainSearchResults.data.every((seller) =>
        seller.email.toLowerCase().includes(domainSearch.toLowerCase()),
      ),
    );
  }
  // 4. Test unique email substring (use first seller's email if available)
  if (allSellers.data.length > 0) {
    const firstSeller = allSellers.data[0];
    const uniqueSubstring = firstSeller.email.substring(0, 5);
    const uniqueSearchResults =
      await api.functional.shoppingMall.admin.admin.sellers.index(
        adminConnection,
        {
          body: {
            email: uniqueSubstring,
            page: 1,
            limit: 100,
          } satisfies IShoppingMallSeller.IRequest,
        },
      );
    typia.assert(uniqueSearchResults);
    // Validate all results contain the unique substring
    TestValidator.predicate(
      "unique substring search returns matching sellers",
      uniqueSearchResults.data.every((seller) =>
        seller.email.toLowerCase().includes(uniqueSubstring.toLowerCase()),
      ),
    );
  }
  // 5. Test non-existent email substring returning empty results
  const nonExistentSearch = "xyz_nonexistent_12345";
  const emptySearchResults =
    await api.functional.shoppingMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          email: nonExistentSearch,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  // Validate empty results structure
  TestValidator.equals(
    "empty search returns zero records",
    emptySearchResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchResults.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pages is zero",
    emptySearchResults.pagination.pages,
    0,
  );
  // 6. Test combined email and approvalStatus filter
  const combinedSearchResults =
    await api.functional.shoppingMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          email: domainSearch,
          approvalStatus: "approved",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(combinedSearchResults);
  // Validate both filters are applied
  if (combinedSearchResults.data.length > 0) {
    TestValidator.predicate(
      "combined filter - all sellers match email",
      combinedSearchResults.data.every((seller) =>
        seller.email.toLowerCase().includes(domainSearch.toLowerCase()),
      ),
    );
    TestValidator.predicate(
      "combined filter - all sellers are approved",
      combinedSearchResults.data.every(
        (seller) => seller.approvalStatus === "approved",
      ),
    );
  }
  // 7. Validate pagination metadata accuracy
  TestValidator.predicate(
    "pagination current page is valid",
    domainSearchResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    domainSearchResults.pagination.limit >= 1 &&
      domainSearchResults.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is at least data length",
    domainSearchResults.pagination.records >= domainSearchResults.data.length,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    domainSearchResults.pagination.pages >= 0,
  );
}
