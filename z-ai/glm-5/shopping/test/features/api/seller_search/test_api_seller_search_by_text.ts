import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test administrator text-based seller search functionality.
 *
 * This test validates the seller search capability allowing administrators
 * to find specific seller accounts by partial matching on shop name or email.
 *
 * Test Steps:
 * 1. Admin authenticates via join endpoint
 * 2. Create multiple sellers with unique identifiable shop names and emails
 * 3. Search by partial shop name - verify case-insensitive matching
 * 4. Search by partial email address - verify matches
 * 5. Test non-matching search term returns empty results
 * 6. Validate combined filtering: search with approval_status filter
 */
export async function test_api_seller_search_by_text(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Create sellers with unique identifiable names
  const uniquePrefix = RandomGenerator.alphaNumeric(8);
  const seller1Email = `seller1_${uniquePrefix}@test.com`;
  const seller1ShopName = `ShopAlpha_${uniquePrefix}`;
  const seller1 = await authorize_seller_join(connection, {
    body: {
      email: seller1Email,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: seller1ShopName,
      shop_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(seller1);
  const seller2Email = `seller2_${uniquePrefix}@test.com`;
  const seller2ShopName = `ShopBeta_${uniquePrefix}`;
  const seller2 = await authorize_seller_join(connection, {
    body: {
      email: seller2Email,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: seller2ShopName,
      shop_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(seller2);
  // 3. Search by partial shop name (case-insensitive)
  const searchByShopName = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        search: `shopalpha_${uniquePrefix.toLowerCase()}`,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(searchByShopName);
  TestValidator.predicate(
    "seller1 found by partial shop name",
    searchByShopName.data.some(
      (s) => s.id === seller1.id && s.shopName === seller1ShopName,
    ),
  );
  TestValidator.predicate(
    "seller2 not found by seller1 shop name search",
    !searchByShopName.data.some((s) => s.id === seller2.id),
  );
  // 4. Search by partial email address
  const searchByEmail = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        search: `seller2_${uniquePrefix}`,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(searchByEmail);
  TestValidator.predicate(
    "seller2 found by partial email",
    searchByEmail.data.some(
      (s) => s.id === seller2.id && s.email === seller2Email,
    ),
  );
  TestValidator.predicate(
    "seller1 not found by seller2 email search",
    !searchByEmail.data.some((s) => s.id === seller1.id),
  );
  // 5. Test non-matching search term returns empty or no matching results
  const nonMatchingSearch = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        search: `nonexistent_${RandomGenerator.alphaNumeric(12)}`,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(nonMatchingSearch);
  TestValidator.predicate(
    "non-matching search returns no created sellers",
    !nonMatchingSearch.data.some(
      (s) => s.id === seller1.id || s.id === seller2.id,
    ),
  );
  // 6. Combined filtering: search with approval_status filter
  const combinedSearch = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        search: uniquePrefix,
        approval_status: "pending",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "both sellers found by unique prefix",
    combinedSearch.data.some((s) => s.id === seller1.id) &&
      combinedSearch.data.some((s) => s.id === seller2.id),
  );
  TestValidator.predicate(
    "all results have pending status",
    combinedSearch.data.every((s) => s.approvalStatus === "pending"),
  );
  // 7. Verify pagination works with search
  const paginatedSearch = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        search: uniquePrefix,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination returns results",
    paginatedSearch.data.length > 0,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    paginatedSearch.pagination.limit === 10,
  );
}
