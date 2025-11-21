import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_account_listing_pending_verification_filtered(
  connection: api.IConnection,
) {
  // The specification requires testing customer account listing with pending_verification status filtering
  // We need to verify that 'pending_verification' customers are excluded and only verified, active accounts are returned

  // Since we can only use the 'index' endpoint and there's no API to create test data,
  // we construct a filter query that should return only active customers
  // According to the API schema, IRequest is defined as string type

  // Create a valid JSON filter string for active status
  // This assumes the backend will parse this as a query filter
  const filterQuery: string = JSON.stringify({
    status: "active",
  });

  // Call the index endpoint with the filter
  const response: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.actors.customers.index(connection, {
      body: filterQuery satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(response);

  // Validate that no pending_verification customers are in the results
  const hasPendingVerification = response.data.some(
    (customer) => customer.status === "pending_verification",
  );
  TestValidator.predicate(
    "no pending_verification customers in results",
    !hasPendingVerification,
  );

  // Validate that all returned customers have active status (as per filtering request)
  const allActive = response.data.every(
    (customer) => customer.status === "active",
  );
  TestValidator.predicate(
    "all returned customers have active status",
    allActive,
  );

  // Validate that the response contains at least one customer (realistic expectation)
  TestValidator.predicate(
    "at least one customer returned",
    response.data.length > 0,
  );

  // Verify pagination information is consistent with data length
  TestValidator.equals(
    "pagination current page matches",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit matches data state",
    response.pagination.limit >= response.data.length,
  );
  TestValidator.predicate(
    "pagination records >= data count",
    response.pagination.records >= response.data.length,
  );
}
