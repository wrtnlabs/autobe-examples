import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_request_search_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Register and authenticate customer
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Since refund request creation functionality is not available in the provided API,
  // we can only test the search endpoint with various date range parameters
  // This tests the API's ability to handle different date filtering scenarios
  const now = new Date();
  // Test filtering by start date only
  const startDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const startFilterResult =
    await api.functional.ecommerce.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          requested_at_start: startDate.toISOString(),
          status: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(startFilterResult);
  // Test filtering by end date only
  const endDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const endFilterResult =
    await api.functional.ecommerce.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          requested_at_end: endDate.toISOString(),
          status: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(endFilterResult);
  // Test combined start/end date filtering
  const combinedFilterResult =
    await api.functional.ecommerce.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          requested_at_start: startDate.toISOString(),
          requested_at_end: endDate.toISOString(),
          status: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Test boundary conditions - exact timestamp
  const boundaryFilterResult =
    await api.functional.ecommerce.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          requested_at_start: now.toISOString(),
          requested_at_end: now.toISOString(),
          status: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(boundaryFilterResult);
  // Test empty search with just pagination
  const emptySearchResult =
    await api.functional.ecommerce.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Validate that all API calls return valid pagination structure
  TestValidator.predicate(
    "start date filter returns valid pagination",
    startFilterResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "end date filter returns valid pagination",
    endFilterResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "combined filter returns valid pagination",
    combinedFilterResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "boundary filter returns valid pagination",
    boundaryFilterResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "empty search returns valid pagination",
    emptySearchResult.pagination !== undefined,
  );
  // Validate pagination metadata integrity
  const results = [
    startFilterResult,
    endFilterResult,
    combinedFilterResult,
    boundaryFilterResult,
    emptySearchResult,
  ];
  for (const result of results) {
    TestValidator.predicate(
      "current page is non-negative",
      result.pagination.current >= 0,
    );
    TestValidator.predicate("limit is positive", result.pagination.limit > 0);
    TestValidator.predicate(
      "records count is non-negative",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count is non-negative",
      result.pagination.pages >= 0,
    );
    // Validate data array matches pagination metadata
    TestValidator.predicate(
      "data length does not exceed limit",
      result.data.length <= result.pagination.limit,
    );
  }
  // Test that the API handles date filtering parameters correctly
  // Even without actual refund requests, we can validate the API doesn't crash
  // and returns proper response structure
  TestValidator.equals(
    "API returns consistent response structure",
    typeof startFilterResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "API returns consistent response structure",
    typeof startFilterResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "API returns consistent response structure",
    typeof startFilterResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "API returns consistent response structure",
    typeof startFilterResult.pagination.pages,
    "number",
  );
}
