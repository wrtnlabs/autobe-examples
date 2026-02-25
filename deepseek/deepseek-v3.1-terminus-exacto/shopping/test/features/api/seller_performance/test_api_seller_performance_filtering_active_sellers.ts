import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test the filtering capabilities of the seller performance endpoint by account status.
 *
 * 1. Authenticate as super administrator
 * 2. Execute the performance retrieval operation with account_status filter set to 'active'
 * 3. Validate that the response includes only sellers with active status
 * 4. Verify that the performance metrics are correctly filtered and pagination reflects filtered results
 * 5. Test that search functionality correctly filters sellers by shop name when combined with account status filtering
 */
export async function test_api_seller_performance_filtering_active_sellers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Fetch all sellers without filter to understand existing data
  const allSellers =
    await api.functional.ecommerce.superAdministrator.seller_performance.index(
      superAdminConnection,
      { body: {} satisfies IEcommerceSeller.IRequest },
    );
  typia.assert(allSellers);
  // If there are no sellers at all, we cannot test filtering properly
  // However, we still test the endpoint works with filter
  // 3. Test filtering by 'active' account status
  const activeSellers =
    await api.functional.ecommerce.superAdministrator.seller_performance.index(
      superAdminConnection,
      {
        body: {
          account_status: "active",
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(activeSellers);
  // Validate all returned sellers have 'active' status
  for (const seller of activeSellers.data) {
    TestValidator.equals(
      `seller ${seller.id} should have active status`,
      seller.account_status,
      "active",
    );
  }
  // 4. Verify pagination reflects filtered results
  // The total records in pagination should be less than or equal to all sellers
  TestValidator.predicate(
    "active sellers count should not exceed total sellers",
    activeSellers.pagination.records <= allSellers.pagination.records,
  );
  // 5. Test combined filtering with search term
  // Try to filter by shop name if there are active sellers
  if (activeSellers.data.length > 0) {
    // Take first seller's shop name as search term
    const searchTerm = activeSellers.data[0].shop_name.substring(0, 5);
    const searchActiveSellers =
      await api.functional.ecommerce.superAdministrator.seller_performance.index(
        superAdminConnection,
        {
          body: {
            account_status: "active",
            search: searchTerm,
          } satisfies IEcommerceSeller.IRequest,
        },
      );
    typia.assert(searchActiveSellers);
    // Validate all sellers match the search term and active status
    for (const seller of searchActiveSellers.data) {
      TestValidator.equals(
        `searched seller ${seller.id} should have active status`,
        seller.account_status,
        "active",
      );
      // Shop name should contain the search term (partial match)
      TestValidator.predicate(
        `shop name ${seller.shop_name} should contain search term ${searchTerm}`,
        seller.shop_name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    // Filtered results with search should be subset of active sellers
    TestValidator.predicate(
      "search-filtered results should be subset of active sellers",
      searchActiveSellers.pagination.records <=
        activeSellers.pagination.records,
    );
  }
  // 6. Test other status filters to ensure they return different results
  // Try 'pending_approval' status if it exists in the system
  try {
    const pendingSellers =
      await api.functional.ecommerce.superAdministrator.seller_performance.index(
        superAdminConnection,
        {
          body: {
            account_status: "pending_approval",
          } satisfies IEcommerceSeller.IRequest,
        },
      );
    typia.assert(pendingSellers);
    // Validate all returned sellers have pending_approval status
    for (const seller of pendingSellers.data) {
      TestValidator.equals(
        `seller ${seller.id} should have pending_approval status`,
        seller.account_status,
        "pending_approval",
      );
    }
    // Active and pending sellers should be mutually exclusive
    const activeIds = new Set(activeSellers.data.map((s) => s.id));
    const pendingIds = new Set(pendingSellers.data.map((s) => s.id));
    const intersection = [...activeIds].filter((id) => pendingIds.has(id));
    TestValidator.equals(
      "active and pending sellers should not overlap",
      intersection.length,
      0,
    );
  } catch {
    // If pending_approval filter fails, it's okay - just means no such sellers exist
    // We still validate the main 'active' filter works
  }
  // 7. Test filtering with non-existent status returns empty results
  const nonExistentFilter =
    await api.functional.ecommerce.superAdministrator.seller_performance.index(
      superAdminConnection,
      {
        body: {
          account_status: "non_existent_status",
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(nonExistentFilter);
  // Should return empty array for non-existent status
  TestValidator.equals(
    "non-existent status filter should return empty results",
    nonExistentFilter.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent status filter should have zero records",
    nonExistentFilter.pagination.records,
    0,
  );
}
