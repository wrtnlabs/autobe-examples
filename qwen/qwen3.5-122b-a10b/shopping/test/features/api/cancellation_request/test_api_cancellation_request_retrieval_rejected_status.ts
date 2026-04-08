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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cancellation_request_retrieval_rejected_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve cancellation request with rejected status
  // Note: Using random UUIDs - backend should return 404 if resources don't exist
  // or return valid data if test database is pre-seeded with test data
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cancellationRequest: IEcommerceCancellationRequest =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.at(
      customerConnection,
      {
        orderId,
        itemId,
        requestId,
      },
    );
  typia.assert(cancellationRequest);
  // 3. Validate cancellation request has rejected status
  TestValidator.equals(
    "cancellation request status is rejected",
    cancellationRequest.status,
    "rejected",
  );
  // 4. Validate seller's response is present for rejected request
  TestValidator.predicate(
    "seller response is present for rejected cancellation",
    cancellationRequest.sellerResponse !== null &&
      cancellationRequest.sellerResponse.length > 0,
  );
  // 5. Validate order item continues processing (status is 'paid')
  TestValidator.equals(
    "order item status is paid (continuing processing)",
    cancellationRequest.orderItem.status,
    "paid",
  );
  // 6. Validate order item summary structure
  TestValidator.predicate(
    "order item quantity is positive",
    cancellationRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item unit price is positive",
    cancellationRequest.orderItem.unit_price > 0,
  );
  // 7. Validate order summary is present
  TestValidator.predicate(
    "order has valid order number",
    cancellationRequest.orderItem.order.order_number.length > 0,
  );
  // 8. Validate product variant summary is present
  TestValidator.predicate(
    "product variant has SKU code",
    cancellationRequest.orderItem.productVariant.sku_code.length > 0,
  );
  // 9. Validate seller summary is present
  TestValidator.predicate(
    "seller has shop name",
    cancellationRequest.orderItem.seller.shop_name.length > 0,
  );
}
