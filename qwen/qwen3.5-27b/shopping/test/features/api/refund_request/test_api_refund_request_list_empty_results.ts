import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that the refund request list endpoint handles empty results gracefully
 * when a customer has no refund requests.
 *
 * 1. Register a new customer account
 * 2. Call refund request list endpoint with no filters
 * 3. Verify empty data array and correct pagination metadata
 * 4. Test with various status filters to ensure consistent empty results
 */
export async function test_api_refund_request_list_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Call refund request list with no filters
  const emptyResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", emptyResult.data.length, 0);
  // 4. Validate pagination metadata for empty results
  TestValidator.equals("records is 0", emptyResult.pagination.records, 0);
  TestValidator.equals("pages is 0", emptyResult.pagination.pages, 0);
  TestValidator.equals("current page is 1", emptyResult.pagination.current, 1);
  TestValidator.equals("limit is default 20", emptyResult.pagination.limit, 20);
  // 5. Test with status='pending' filter
  const pendingResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "pending filter returns empty",
    pendingResult.data.length,
    0,
  );
  TestValidator.equals(
    "pending records is 0",
    pendingResult.pagination.records,
    0,
  );
  // 6. Test with status='approved' filter
  const approvedResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved filter returns empty",
    approvedResult.data.length,
    0,
  );
  TestValidator.equals(
    "approved records is 0",
    approvedResult.pagination.records,
    0,
  );
  // 7. Test with status='rejected' filter
  const rejectedResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected filter returns empty",
    rejectedResult.data.length,
    0,
  );
  TestValidator.equals(
    "rejected records is 0",
    rejectedResult.pagination.records,
    0,
  );
}
