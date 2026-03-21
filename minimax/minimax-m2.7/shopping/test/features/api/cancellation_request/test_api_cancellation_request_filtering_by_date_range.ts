import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test cancellation request filtering by date range for administrators.
 *
 * Validates that administrators can filter cancellation requests using
 * dateFrom and dateTo query parameters to view requests created within
 * specific time periods. Tests three filtering scenarios:
 * 1. Both dateFrom and dateTo specified (full range)
 * 2. Only dateFrom specified (from date forward)
 * 3. Only dateTo specified (up to date)
 *
 * Business Workflow: Enables administrators to audit cancellation requests
 * within specific time periods for reporting and compliance purposes.
 */
export async function test_api_cancellation_request_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Get all cancellation requests to establish baseline
  const allRequestsResponse =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequestsResponse);
  // Step 3: Test filtering with dateFrom only
  // Get requests from 30 days ago to now
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateFromOnlyResponse =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          dateFrom: thirtyDaysAgo.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(dateFromOnlyResponse);
  // Validate: all records should have created_at >= dateFrom
  for (const request of dateFromOnlyResponse.data) {
    const requestDate = new Date(request.created_at);
    TestValidator.predicate(
      "created_at >= dateFrom",
      requestDate.getTime() >= thirtyDaysAgo.getTime(),
    );
  }
  // Step 4: Test filtering with dateTo only
  // Get requests up to 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateToOnlyResponse =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          dateTo: sevenDaysAgo.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(dateToOnlyResponse);
  // Validate: all records should have created_at <= dateTo
  for (const request of dateToOnlyResponse.data) {
    const requestDate = new Date(request.created_at);
    TestValidator.predicate(
      "created_at <= dateTo",
      requestDate.getTime() <= sevenDaysAgo.getTime(),
    );
  }
  // Step 5: Test filtering with both dateFrom and dateTo
  // Create a narrower date range for precise filtering
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 7);
  const fullRangeResponse =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          dateFrom: startDate.toISOString(),
          dateTo: endDate.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(fullRangeResponse);
  // Validate: all records should have created_at within the range
  for (const request of fullRangeResponse.data) {
    const requestDate = new Date(request.created_at);
    TestValidator.predicate(
      "created_at within range",
      requestDate.getTime() >= startDate.getTime() &&
        requestDate.getTime() <= endDate.getTime(),
    );
  }
  // Step 6: Validate pagination metadata reflects filtered count
  // The records count should not exceed the total when filtering
  if (fullRangeResponse.data.length > 0) {
    TestValidator.predicate(
      "records count is reasonable",
      fullRangeResponse.pagination.records <=
        allRequestsResponse.pagination.records,
    );
  }
  // Step 7: Test with no date filters - should return all records
  const noFilterResponse =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(noFilterResponse);
  // Validate pagination metadata structure
  TestValidator.equals(
    "current page is 1",
    noFilterResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    noFilterResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    noFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    noFilterResponse.pagination.pages >= 0,
  );
}
