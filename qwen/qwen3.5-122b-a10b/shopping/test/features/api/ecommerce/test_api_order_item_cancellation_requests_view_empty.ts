import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer viewing cancellation requests for an order item with no existing requests.
 *
 * Validates the endpoint behavior when a customer queries cancellation requests for their order item that has not yet had any cancellation requests submitted. The test confirms the endpoint returns an empty data array with properly structured pagination metadata.
 *
 * This scenario tests the normal case where a paid order item is eligible for cancellation requests but none have been created yet. The response structure must be valid even with zero records, ensuring the pagination system handles empty result sets correctly.
 *
 * 1. Customer registers and authenticates with the system.
 * 2. Generate random UUIDs for order and order item identifiers.
 * 3. Query cancellation requests endpoint with empty filters.
 * 4. Validate empty data array and pagination metadata (records=0, pages=0).
 */
export async function test_api_order_item_cancellation_requests_view_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate random order and item IDs (simulation mode will handle mock data)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. View cancellation requests (empty result set)
  const result: IPageIEcommerceCancellationRequest.ISummary =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {} satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate empty result set with proper pagination metadata
  TestValidator.equals("data array is empty", result.data.length, 0);
  TestValidator.equals("records count is 0", result.pagination.records, 0);
  TestValidator.equals("pages count is 0", result.pagination.pages, 0);
  TestValidator.predicate(
    "current page is valid",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
}
