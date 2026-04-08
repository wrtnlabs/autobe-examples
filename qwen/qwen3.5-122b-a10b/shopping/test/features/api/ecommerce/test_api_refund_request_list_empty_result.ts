import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
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

/**
 * Test refund request list returns empty result for order item with no refund requests.
 *
 * Validates that when querying refund requests for an order item that has no associated refund requests, the API correctly returns an empty paginated response with proper metadata. This ensures the edge case of zero refund requests is handled gracefully without errors.
 *
 * The test creates a customer account, generates random order and item IDs, and queries the refund request endpoint. The response must contain an empty data array with pagination metadata showing zero records and zero pages.
 *
 * 1. Customer account is created and authenticated.
 * 2. Random UUIDs are generated for orderId and itemId.
 * 3. Refund request index endpoint is called with empty search criteria.
 * 4. Response is validated:
 *    - data array is empty
 *    - pagination.current equals 1
 *    - pagination.records equals 0
 *    - pagination.pages equals 0
 *    - pagination.limit is positive
 */
export async function test_api_refund_request_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate random UUIDs for order and item (simulating order item reference)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Query refund requests with empty search criteria
  const response =
    await api.functional.ecommerce.customer.orders.items.refund_requests.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {} satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate empty result structure
  TestValidator.equals("data array is empty", response.data.length, 0);
  TestValidator.equals("records count is 0", response.pagination.records, 0);
  TestValidator.equals("pages count is 0", response.pagination.pages, 0);
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
}
