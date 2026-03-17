import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
 * Test the refund request list endpoint when no refund requests exist for the authenticated customer.
 *
 * This test verifies that the refund request list endpoint returns a properly formatted
 * empty page when the customer has no refund requests.
 *
 * **Prerequisites:**
 * - Customer account created via join endpoint
 *
 * **Test Flow:**
 * 1. Create and authenticate a new customer account
 * 2. Request refund request list with empty filters
 * 3. Validate response structure and pagination metadata
 */
export async function test_api_refund_request_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Call the refund requests list endpoint with empty filter parameters
  const response =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Verify pagination metadata for empty result
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be default 20",
    response.pagination.limit,
    20,
  );
  TestValidator.equals("records should be 0", response.pagination.records, 0);
  TestValidator.equals("pages should be 0", response.pagination.pages, 0);
  TestValidator.equals("data array should be empty", response.data.length, 0);
}
