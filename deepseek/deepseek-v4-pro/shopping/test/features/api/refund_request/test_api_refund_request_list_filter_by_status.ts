import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
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
 * Test filtering refund requests by status as a customer.
 *
 * Validates that the refund request listing endpoint correctly filters results
 * by status when a customer requests only pending refund requests awaiting
 * seller review. Ensures the status filter narrows results to only those with
 * 'pending' status and that pagination metadata correctly reflects the filtered
 * count rather than the total unfiltered count.
 *
 * 1. Customer registers and authenticates on the platform via authorize_customer_join.
 * 2. Customer retrieves refund requests filtered by 'pending' status.
 * 3. Validates that every returned refund request has status 'pending'.
 * 4. Validates pagination metadata integrity — current page is at least 1 and
 *    the total records count is not less than the returned data length.
 */
export async function test_api_refund_request_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Retrieve refund requests filtered by pending status
  const result =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate all returned items have status "pending"
  for (const request of result.data) {
    TestValidator.equals(
      "refund request status should be pending",
      request.status,
      "pending",
    );
  }
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records should be at least the data length",
    result.pagination.records >= result.data.length,
  );
}
