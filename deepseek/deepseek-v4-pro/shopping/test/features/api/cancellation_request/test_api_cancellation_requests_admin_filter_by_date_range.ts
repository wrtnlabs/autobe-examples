import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin filtering of cancellation requests by creation date range.
 *
 * Validates that an authenticated administrator can filter cancellation requests using the createdFrom and createdTo parameters. The test verifies that all returned records fall within the specified inclusive date range, that pagination metadata correctly reflects the current page and data constraints, and that results appear in ascending chronological order when sortBy is set to "created_at" with sortDirection "asc".
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Fetches all cancellation requests without date filters to establish a baseline date range.
 * 3. Applies the date range filter with ascending sort, fetching paginated results.
 * 4. Validates each returned record's created_at falls within [createdFrom, createdTo] inclusive.
 * 5. Validates records are sorted in ascending chronological order.
 * 6. Validates pagination metadata consistency (current page, data length vs limit).
 */
export async function test_api_cancellation_requests_admin_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Fetch all cancellation requests to establish baseline date range
  const allRequests =
    await api.functional.shoppingMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          sortBy: "created_at",
          sortDirection: "asc",
          page: 1 satisfies number as number,
          limit: 100 satisfies number as number,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // 3. Determine the date range boundaries from existing data
  const requestsData = allRequests.data;
  const createdFrom: string =
    requestsData.length > 0
      ? requestsData[0].created_at
      : new Date(0).toISOString();
  const createdTo: string =
    requestsData.length > 0
      ? requestsData[requestsData.length - 1].created_at
      : new Date().toISOString();
  // 4. Filter by date range with ascending sort
  const filteredRequests =
    await api.functional.shoppingMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          createdFrom,
          createdTo,
          sortBy: "created_at",
          sortDirection: "asc",
          page: 1 satisfies number as number,
          limit: 100 satisfies number as number,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredRequests);
  // 5. Validate all records fall within the date range (inclusive bounds)
  const fromTimestamp = new Date(createdFrom).getTime();
  const toTimestamp = new Date(createdTo).getTime();
  for (const request of filteredRequests.data) {
    const createdAt = new Date(request.created_at).getTime();
    TestValidator.predicate(
      "Request created_at >= createdFrom",
      createdAt >= fromTimestamp,
    );
    TestValidator.predicate(
      "Request created_at <= createdTo",
      createdAt <= toTimestamp,
    );
  }
  // 6. Validate ascending chronological order
  for (let i = 1; i < filteredRequests.data.length; i++) {
    const prevTime = new Date(
      filteredRequests.data[i - 1].created_at,
    ).getTime();
    const currTime = new Date(filteredRequests.data[i].created_at).getTime();
    TestValidator.predicate(
      `Results in ascending order at index ${i}`,
      prevTime <= currTime,
    );
  }
  // 7. Validate pagination metadata consistency
  TestValidator.predicate(
    "Data array length does not exceed page limit",
    filteredRequests.data.length <= filteredRequests.pagination.limit,
  );
  TestValidator.equals(
    "Pagination current page is 1",
    filteredRequests.pagination.current,
    1,
  );
}
