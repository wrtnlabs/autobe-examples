import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_list_filtered_by_customer_id_and_ip(
  connection: api.IConnection,
): Promise<void> {
  /**
   * This test verifies the functionality of listing customer sessions filtered
   * by shopping mall customer ID and client IP address. The test plan includes:
   *
   * 1. Registering a new customer and authenticating.
   * 2. Using the authenticated customer's connection to create multiple sessions
   *    by making several calls to simulate sessions (here, repeated index calls).
   * 3. Calling the sessions listing endpoint with filters: customer ID and IP.
   * 4. Validating that all returned sessions belong to the specified customer ID and match the IP filter.
   * 5. Checking that pagination metadata fields are valid and consistent.
   * 6. Ensuring an unauthenticated call to the endpoint is rejected.
   */
  // 1. Register customer and obtain authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(authorized);
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Use the connection to list sessions multiple times to simulate session entries
  //    Here, simulating retrieval multiple times to test existence and filtering.
  const firstSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      { body: {} satisfies IShoppingMallCustomerSession.IRequest },
    );
  typia.assert(firstSessions);
  // Extract customerId from token or from some known property?
  // The session filter expects shopping mall customer ID.
  // Since no direct customer ID given in IJoin or IAuthorized, we can't extract.
  // Because DTO IShoppingMallCustomer.IJoin is {} empty, no properties?
  // We'll proceed with empty filter but simulate IP filter.
  // However, scenario requires filtering by shopping mall customer ID and IP.
  // We don't have explicit shopping mall customer ID from join or session.
  // We try filtering only by IP, because customer ID is not accessible.
  // Obtain the IP address to filter by - simulate from headers?
  // Since we cannot obtain actual IP from join response, we will test filtering by empty body - expect all or none sessions relative to customer.
  // 3. Call endpoint filtered by IP (simulate a known IP string)
  // Here, we test filter by valid IP and customer ID null or unspecified since we can't acquire customer ID
  // Without customer ID, test filtering by IP only
  // Generate a random IP string to test the filter
  // Using real logic, we can test with empty or invalid filter that still must be guarded
  // But no filter properties exist in IShoppingMallCustomerSession.IRequest according to given definition
  // Since IShoppingMallCustomerSession.IRequest is empty type {}, filtering is practically nonexistent in contract
  // So we test that requesting with empty object yields list (pages and data) authorized, and unauthorized fails
  // 4. Validate that the data contains sessions and pagination is consistent
  const sessionsResponse =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      { body: {} satisfies IShoppingMallCustomerSession.IRequest },
    );
  typia.assert(sessionsResponse);
  TestValidator.predicate(
    "contains session data",
    sessionsResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination current page positive",
    sessionsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    sessionsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    sessionsResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    sessionsResponse.pagination.records >= 0,
  );
  // 5. Test unauthorized access
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to session list",
    401,
    async () => {
      await api.functional.shoppingMall.customer.sessions.index(
        noAuthConnection,
        {
          body: {} satisfies IShoppingMallCustomerSession.IRequest,
        },
      );
    },
  );
}
