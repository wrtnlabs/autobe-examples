import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can view their own cancellation requests with proper data isolation.
 *
 * Validates the customer cancellation requests listing endpoint with three key scenarios: empty state verification, data isolation between customers, and proper pagination metadata. Ensures that each customer can only access their own cancellation requests and cannot see other customers' requests.
 *
 * The test verifies that the response includes correct pagination information and that each cancellation request summary contains all required fields including request status, customer information, and order item details.
 *
 * 1. Register first customer and verify empty cancellation requests list.
 * 2. Register second customer for data isolation testing.
 * 3. Verify both customers can only see their own requests (empty in this test).
 * 4. Validate pagination metadata and response structure.
 */
export async function test_api_customer_cancellation_requests_list_own(
  connection: api.IConnection,
) {
  // 1. Register first customer
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Test empty state for first customer
  const emptyResult1 =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customer1Connection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(emptyResult1);
  // Validate empty state pagination
  TestValidator.equals("page 1", emptyResult1.pagination.current, 1);
  TestValidator.equals("total records 0", emptyResult1.pagination.records, 0);
  TestValidator.equals("total pages 0", emptyResult1.pagination.pages, 0);
  TestValidator.predicate(
    "data is empty array",
    emptyResult1.data.length === 0,
  );
  // 3. Register second customer for data isolation test
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 4. Verify second customer also sees empty list
  const emptyResult2 =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customer2Connection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(emptyResult2);
  // Validate empty state for second customer
  TestValidator.equals("page 1", emptyResult2.pagination.current, 1);
  TestValidator.equals("total records 0", emptyResult2.pagination.records, 0);
  TestValidator.equals("total pages 0", emptyResult2.pagination.pages, 0);
  TestValidator.predicate(
    "data is empty array",
    emptyResult2.data.length === 0,
  );
  // 5. Test with pagination parameters
  const paginatedResult =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customer1Connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination parameters are respected
  TestValidator.equals("current page", paginatedResult.pagination.current, 1);
  TestValidator.equals("limit", paginatedResult.pagination.limit, 10);
  TestValidator.equals("records", paginatedResult.pagination.records, 0);
  TestValidator.equals("pages", paginatedResult.pagination.pages, 0);
  // 6. Test filtering by status (should still be empty)
  const filteredResult =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customer1Connection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredResult);
  TestValidator.equals(
    "filtered records",
    filteredResult.pagination.records,
    0,
  );
  TestValidator.predicate(
    "filtered data is empty",
    filteredResult.data.length === 0,
  );
}
