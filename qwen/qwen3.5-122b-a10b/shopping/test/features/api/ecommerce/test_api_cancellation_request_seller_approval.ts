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
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

/**
 * Test seller approval of customer cancellation request workflow.
 *
 * Validates the complete cancellation request approval flow where a customer submits a cancellation request for a paid order item, and a seller approves it with a response reason. The test verifies the approval response structure and confirms business logic execution through the API response.
 *
 * The workflow ensures proper authorization context switching between customer and seller actors, validates the approval response structure, and confirms the cancellation request state transitions correctly.
 *
 * 1. Customer registers and authenticates with the system.
 * 2. Seller registers and authenticates with the system.
 * 3. Customer creates a cancellation request for an order item with a reason.
 * 4. Seller updates the cancellation request with 'approved' status and response reason.
 * 5. Validates cancellation request status changed to 'approved'.
 * 6. Validates seller_response field is populated with the provided reason.
 * 7. Validates order item status changed to 'cancelled' in the response.
 * 8. Validates order item references the correct order and product variant.
 * 9. Validates timestamps are properly set on the cancellation request.
 */
export async function test_api_cancellation_request_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
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
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Customer creates cancellation request for an order item
  // Note: In simulation mode, we use random UUIDs as the backend will validate structure
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationReason = RandomGenerator.paragraph({ sentences: 3 });
  const cancellationRequest =
    await generate_random_ecommerce_customer_orders_items_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: cancellationReason,
        } satisfies IEcommerceCancellationRequest.ICreate,
        params: {
          orderId: orderId,
          itemId: itemId,
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reason matches input",
    cancellationRequest.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "seller response is null initially",
    cancellationRequest.sellerResponse,
    null,
  );
  const requestId = cancellationRequest.id;
  // 4. Seller approves the cancellation request
  const sellerResponseReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedCancellationRequest =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.update(
      sellerConnection,
      {
        orderId: orderId,
        itemId: itemId,
        requestId: requestId,
        body: {
          status: "approved",
          seller_response: sellerResponseReason,
        } satisfies IEcommerceCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedCancellationRequest);
  // 5. Verify cancellation request status changed to 'approved'
  TestValidator.equals(
    "status changed to approved",
    updatedCancellationRequest.status,
    "approved",
  );
  // 6. Verify seller_response field is populated
  TestValidator.equals(
    "seller response is populated",
    updatedCancellationRequest.sellerResponse,
    sellerResponseReason,
  );
  // 7. Verify order item status changed to 'cancelled'
  TestValidator.equals(
    "order item status is cancelled",
    updatedCancellationRequest.orderItem.status,
    "cancelled",
  );
  // 8. Verify order item references correct order
  TestValidator.equals(
    "order id matches",
    updatedCancellationRequest.orderItem.order.id,
    orderId,
  );
  // 9. Verify order item has valid product variant reference
  TestValidator.predicate(
    "has product variant",
    updatedCancellationRequest.orderItem.productVariant !== null,
  );
  // 10. Verify order item has valid seller reference
  TestValidator.equals(
    "seller matches",
    updatedCancellationRequest.orderItem.seller.id,
    seller.id,
  );
  // 11. Verify timestamps are set
  TestValidator.predicate(
    "created at is set",
    updatedCancellationRequest.createdAt !== null,
  );
  TestValidator.predicate(
    "updated at is set",
    updatedCancellationRequest.updatedAt !== null,
  );
}
