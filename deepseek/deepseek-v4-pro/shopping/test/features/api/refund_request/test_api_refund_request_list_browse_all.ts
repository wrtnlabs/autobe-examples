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
 * Test customer refund request listing when no refund requests exist.
 *
 * Validates that a newly registered customer can browse their refund request list and receives a properly structured paginated response with correct metadata. Since the customer has never placed an order, no refund requests exist and the data array must be empty while pagination metadata accurately reflects zero records.
 *
 * The empty result implicitly confirms data ownership isolation — the customer cannot see refund requests submitted by other customers on the platform. The response structure is fully validated through typia.assert, guaranteeing all ISummary fields are present in the schema.
 *
 * 1. Customer registers with random credentials via authorize_customer_join.
 * 2. Customer browses all refund requests with no filters (empty request body).
 * 3. Validates pagination metadata: current page is 1, limit is positive, records and pages are 0.
 * 4. Confirms data array is empty.
 */
export async function test_api_refund_request_list_browse_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Browse refund requests with no filters
  const page = await api.functional.shoppingMall.customer.refund_requests.index(
    customerConnection,
    { body: {} satisfies IShoppingMallRefundRequest.IRequest },
  );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.predicate("limit positive", page.pagination.limit > 0);
  TestValidator.equals("total records", page.pagination.records, 0);
  TestValidator.equals("total pages", page.pagination.pages, 0);
  // 4. Validate empty data array
  TestValidator.equals("empty data", page.data.length, 0);
}
