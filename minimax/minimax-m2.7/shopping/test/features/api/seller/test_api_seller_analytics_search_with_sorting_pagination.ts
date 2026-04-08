import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test combining text search with sorting and pagination for seller analytics.
 *
 * Validates the seller analytics endpoint with combined search, sorting, and pagination parameters. Tests that:
 * 1. Text search correctly matches partial text against seller email and shopName (case-insensitive)
 * 2. Results are sorted by totalRevenue in descending order
 * 3. Pagination metadata (current page, limit, records, total pages) is accurate
 * 4. The search filter works alongside sorting and pagination simultaneously
 *
 * 1.1. Authenticate as superAdmin using authorize_super_admin_join utility
 * 1.2. Create superAdmin-specific connection with auth token from result
 * 2.1. Call analytics endpoint with search="shop", sort="total_revenue", order="desc", page=1, limit=10
 * 2.2. Validate response with typia.assert() for complete type validation
 * 3.1. Verify pagination.current equals 1
 * 3.2. Verify pagination.limit equals 10
 * 3.3. Verify pagination.records >= 0
 * 3.4. Verify pagination.pages calculated correctly (Math.ceil(records / limit))
 * 4.1. Verify results are sorted by totalRevenue descending
 * 4.2. Verify search filter matches partial text in email or shopName (case-insensitive)
 */
export async function test_api_seller_analytics_search_with_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Call seller analytics endpoint with search, sorting, and pagination
  const response =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.sellers.index(
      superAdminConnection,
      {
        body: {
          search: "shop",
          sort: "total_revenue",
          order: "desc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Validate results are sorted by totalRevenue in descending order
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i];
      const next = response.data[i + 1];
      TestValidator.predicate(
        `result ${i} has totalRevenue >= result ${i + 1}`,
        current.totalRevenue >= next.totalRevenue,
      );
    }
  }
  // 5. Validate search matches partial text in email or shopName (case-insensitive)
  const searchTerm = "shop";
  for (const seller of response.data) {
    const emailMatches = seller.email
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const shopNameMatches =
      seller.shopName !== null &&
      seller.shopName.toLowerCase().includes(searchTerm.toLowerCase());
    TestValidator.predicate(
      `seller ${seller.id} email or shopName matches search term "${searchTerm}"`,
      emailMatches || shopNameMatches,
    );
  }
}
