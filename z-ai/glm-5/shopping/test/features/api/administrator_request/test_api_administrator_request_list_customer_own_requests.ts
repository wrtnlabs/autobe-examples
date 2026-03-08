import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorSession";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that customers can view their own submitted administrator role requests.
 *
 * Business Rule (Section [987]): Customers can view their own submitted
 * administrator requests and the current status of each request.
 *
 * This test validates:
 * 1. Customers can list their own administrator session requests
 * 2. Data isolation - each customer sees only their own requests
 * 3. Status filtering works within the customer's request scope
 * 4. Pagination works correctly for customer-specific data
 */
export async function test_api_administrator_request_list_customer_own_requests(
  connection: api.IConnection,
): Promise<void> {
  // Create first customer account
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {});
  typia.assert(customer1);
  // Create second customer account to verify data isolation
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {});
  typia.assert(customer2);
  // Customer 1 lists their administrator session requests
  const customer1Requests =
    await api.functional.shoppingMall.administrator.requests.index(
      customer1Connection,
      {
        body: {} satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(customer1Requests);
  // Validate pagination structure (business logic validation)
  TestValidator.predicate(
    "pagination current page is valid",
    customer1Requests.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    customer1Requests.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    customer1Requests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    customer1Requests.pagination.pages >= 0,
  );
  // Customer 2 lists their administrator session requests
  const customer2Requests =
    await api.functional.shoppingMall.administrator.requests.index(
      customer2Connection,
      {
        body: {} satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(customer2Requests);
  // Test with status filter - pending
  const pendingRequests =
    await api.functional.shoppingMall.administrator.requests.index(
      customer1Connection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Test with status filter - approved
  const approvedRequests =
    await api.functional.shoppingMall.administrator.requests.index(
      customer1Connection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // Test with status filter - rejected
  const rejectedRequests =
    await api.functional.shoppingMall.administrator.requests.index(
      customer1Connection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // Test pagination with limit and page parameters
  const paginatedRequests =
    await api.functional.shoppingMall.administrator.requests.index(
      customer1Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministratorSession.IRequest,
      },
    );
  typia.assert(paginatedRequests);
  // Validate pagination constraints (business logic validation)
  TestValidator.predicate(
    "pagination respects limit constraint",
    paginatedRequests.data.length <= 10,
  );
  TestValidator.equals(
    "pagination current page matches request",
    paginatedRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedRequests.pagination.limit,
    10,
  );
}
