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
 * Test pagination and date range filtering capabilities of the seller performance endpoint.
 */
export async function test_api_seller_performance_pagination_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Test pagination with different page and limit combinations
  const paginationTests = [
    { page: 1, limit: 10 },
    { page: 2, limit: 5 },
    { page: 3, limit: 20 },
  ];
  for (const pagination of paginationTests) {
    const paginationResponse =
      await api.functional.ecommerce.superAdministrator.seller_performance.index(
        adminConnection,
        {
          body: {
            page: pagination.page,
            limit: pagination.limit,
          } satisfies IEcommerceSeller.IRequest,
        },
      );
    typia.assert(paginationResponse);
    // Validate pagination metadata
    TestValidator.equals(
      "current page matches request",
      paginationResponse.pagination.current,
      pagination.page,
    );
    TestValidator.equals(
      "limit matches request",
      paginationResponse.pagination.limit,
      pagination.limit,
    );
    TestValidator.predicate(
      "records count is non-negative",
      paginationResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count is non-negative",
      paginationResponse.pagination.pages >= 0,
    );
    // Validate data array size
    TestValidator.predicate(
      "data array size does not exceed limit",
      paginationResponse.data.length <= pagination.limit,
    );
  }
  // 3. Test date range filtering
  const now = new Date();
  const oneMonthAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Test created_after filter
  const afterResponse =
    await api.functional.ecommerce.superAdministrator.seller_performance.index(
      adminConnection,
      {
        body: {
          created_after: oneMonthAgo,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(afterResponse);
  // Test created_before filter
  const beforeResponse =
    await api.functional.ecommerce.superAdministrator.seller_performance.index(
      adminConnection,
      {
        body: {
          created_before: oneWeekAgo,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(beforeResponse);
  // Test combined date range filter
  const rangeResponse =
    await api.functional.ecommerce.superAdministrator.seller_performance.index(
      adminConnection,
      {
        body: {
          created_after: oneMonthAgo,
          created_before: oneWeekAgo,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(rangeResponse);
  // Validate that sellers in filtered results fall within date range
  if (rangeResponse.data.length > 0) {
    for (const seller of rangeResponse.data) {
      const sellerCreatedAt = new Date(seller.created_at);
      const startDate = new Date(oneMonthAgo);
      const endDate = new Date(oneWeekAgo);
      TestValidator.predicate(
        "seller created after start date",
        sellerCreatedAt >= startDate,
      );
      TestValidator.predicate(
        "seller created before end date",
        sellerCreatedAt <= endDate,
      );
    }
  }
  // 4. Test search functionality with partial shop name matching
  const searchResponse =
    await api.functional.ecommerce.superAdministrator.seller_performance.index(
      adminConnection,
      {
        body: {
          search: "shop",
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 5. Test account status filtering
  const statusResponse =
    await api.functional.ecommerce.superAdministrator.seller_performance.index(
      adminConnection,
      {
        body: {
          account_status: "active",
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(statusResponse);
  if (statusResponse.data.length > 0) {
    for (const seller of statusResponse.data) {
      TestValidator.equals(
        "seller account status matches filter",
        seller.account_status,
        "active",
      );
    }
  }
}
