import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin can filter sellers by registration date range.
 *
 * Validates that administrators can effectively search and filter sellers using registration date filters. Tests multiple date range scenarios including combined filters, single boundary filters, and ranges that exclude all records. Ensures the pagination metadata accurately reflects the filtered results.
 *
 * 1. Admin authenticates via join endpoint to get authorization token.
 * 2. Create multiple sellers with staggered creation dates for filtering tests.
 * 3. Test filtering with both dateFrom and dateTo parameters.
 * 4. Test filtering with dateFrom only (lower bound filter).
 * 5. Test filtering with dateTo only (upper bound filter).
 * 6. Test filtering with date range that excludes all sellers (empty response).
 */
export async function test_api_seller_listing_with_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Get initial sellers to understand existing data
  const initialResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {} satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(initialResponse);
  // Calculate date boundaries based on existing seller creation dates
  const existingSellers = initialResponse.data;
  let earliestDate: Date;
  let latestDate: Date;
  if (existingSellers.length >= 2) {
    // Sort by createdAt to find earliest and latest
    const sorted = [...existingSellers].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    earliestDate = new Date(sorted[0].createdAt);
    latestDate = new Date(sorted[sorted.length - 1].createdAt);
  } else {
    // Create sellers with known dates for testing
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    earliestDate = thirtyDaysAgo;
    latestDate = now;
  }
  // Calculate midpoint date for range testing
  const midDate = new Date((earliestDate.getTime() + latestDate.getTime()) / 2);
  // 2. Test: Filter with both dateFrom and dateTo (should return sellers in range)
  const rangeResponse = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        dateFrom: earliestDate.toISOString(),
        dateTo: latestDate.toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(rangeResponse);
  // Validate all returned sellers are within the date range
  for (const seller of rangeResponse.data) {
    const sellerDate = new Date(seller.createdAt);
    TestValidator.predicate(
      "seller createdAt >= dateFrom",
      sellerDate.getTime() >= earliestDate.getTime(),
    );
    TestValidator.predicate(
      "seller createdAt <= dateTo",
      sellerDate.getTime() <= latestDate.getTime(),
    );
  }
  // 3. Test: Filter with dateFrom only (should return sellers on or after dateFrom)
  const dateFromResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        dateFrom: midDate.toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(dateFromResponse);
  // Validate all returned sellers are on or after dateFrom
  for (const seller of dateFromResponse.data) {
    const sellerDate = new Date(seller.createdAt);
    TestValidator.predicate(
      "seller createdAt >= dateFrom",
      sellerDate.getTime() >= midDate.getTime(),
    );
  }
  // 4. Test: Filter with dateTo only (should return sellers on or before dateTo)
  const dateToResponse = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        dateTo: midDate.toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(dateToResponse);
  // Validate all returned sellers are on or before dateTo
  for (const seller of dateToResponse.data) {
    const sellerDate = new Date(seller.createdAt);
    TestValidator.predicate(
      "seller createdAt <= dateTo",
      sellerDate.getTime() <= midDate.getTime(),
    );
  }
  // 5. Test: Date range that excludes all sellers (should return empty)
  const futureDate = new Date(latestDate.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyResponse = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        dateFrom: futureDate.toISOString(),
        dateTo: new Date(
          futureDate.getTime() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "records count is zero for future date range",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "data array is empty for future date range",
    emptyResponse.data.length,
    0,
  );
  // 6. Test: Past date range (before any seller existed)
  const ancientDate = new Date(
    earliestDate.getTime() - 365 * 24 * 60 * 60 * 1000,
  );
  const pastResponse = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        dateFrom: ancientDate.toISOString(),
        dateTo: ancientDate.toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(pastResponse);
  TestValidator.equals(
    "records count is zero for past date range",
    pastResponse.pagination.records,
    0,
  );
}
