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
 * Test seller list email search functionality for administrator oversight.
 *
 * Validates the email search capability allowing administrators to find specific sellers by partial email match. Tests partial matching behavior, case-insensitive search, and pagination metadata accuracy.
 *
 * The test authenticates as an administrator and performs multiple search queries with different email patterns to verify the search functionality works correctly. It confirms that only sellers with matching email addresses are returned and that pagination information accurately reflects the search result count.
 *
 * 1. Administrator authentication via authorize_admin_join utility.
 * 2. Search with partial email domain to find multiple matching sellers.
 * 3. Search with uppercase variant to verify case-insensitive matching.
 * 4. Search with specific email substring for targeted results.
 * 5. Search without email filter to retrieve all sellers.
 * 6. Validate pagination metadata matches actual result counts.
 * 7. Verify all returned sellers have emails containing search terms.
 */
export async function test_api_seller_list_email_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test partial email domain search - search for common domain pattern
  const domainSearch = "test.com";
  const domainSearchResult =
    await api.functional.shoppingMall.admin.sellers.index(adminConnection, {
      body: {
        email: domainSearch,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(domainSearchResult);
  // Validate all returned sellers have emails containing the search term
  TestValidator.predicate(
    "all sellers contain search domain",
    domainSearchResult.data.every((seller) =>
      seller.email.toLowerCase().includes(domainSearch.toLowerCase()),
    ),
  );
  // Validate pagination metadata - data length should not exceed total records
  TestValidator.predicate(
    "data length within total records",
    domainSearchResult.data.length <= domainSearchResult.pagination.records,
  );
  // 3. Test case-insensitive search with uppercase variant
  const uppercaseSearch = "TEST.COM";
  const uppercaseResult = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        email: uppercaseSearch,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(uppercaseResult);
  // Case-insensitive search should return same results as lowercase
  TestValidator.equals(
    "case-insensitive returns same count",
    uppercaseResult.pagination.records,
    domainSearchResult.pagination.records,
  );
  // 4. Test with different email pattern - search for another domain
  const alternativeSearch = "example";
  const alternativeResult =
    await api.functional.shoppingMall.admin.sellers.index(adminConnection, {
      body: {
        email: alternativeSearch,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(alternativeResult);
  // Validate all returned sellers match the search term
  TestValidator.predicate(
    "all sellers contain alternative search term",
    alternativeResult.data.every((seller) =>
      seller.email.toLowerCase().includes(alternativeSearch.toLowerCase()),
    ),
  );
  // 5. Test without email filter - retrieve all sellers
  const allSellersResult =
    await api.functional.shoppingMall.admin.sellers.index(adminConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(allSellersResult);
  // Validate that unfiltered results contain at least as many sellers as filtered
  TestValidator.predicate(
    "unfiltered results >= filtered results",
    allSellersResult.pagination.records >=
      domainSearchResult.pagination.records,
  );
  // 6. Validate search result counts are consistent
  TestValidator.predicate(
    "alternative search within total",
    alternativeResult.pagination.records <= allSellersResult.pagination.records,
  );
}
