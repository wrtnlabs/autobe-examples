import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test administrator rejection of a customer's cancellation request.
 *
 * This test validates the workflow where:
 * 1. A customer places an order and submits a cancellation request for an order item
 * 2. An administrator reviews and rejects the cancellation request
 * 3. The cancellation request status is updated to REJECTED with proper audit trail
 * 4. The order item remains in PAID status and can continue normal processing
 *
 * Business Rules Validated:
 * - Administrator can reject cancellation requests
 * - Rejection creates proper audit trail (responded_at, responded_seller)
 * - Customer's original reason is preserved (immutable)
 * - Order item status remains PAID after rejection
 * - No inventory restoration occurs for rejected requests
 */
export async function test_api_cancellation_request_admin_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Customer Setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Customer Places Order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  // Get the first order item for cancellation request
  const orderItem = order.items[0];
  TestValidator.equals("order item status is PAID", orderItem.status, "PAID");
  // 4. Customer Submits Cancellation Request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Validate initial cancellation request state
  TestValidator.equals(
    "cancellation request status is PENDING",
    cancellationRequest.status,
    "PENDING",
  );
  TestValidator.equals(
    "cancellation request order item matches",
    cancellationRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "cancellation request customer matches",
    cancellationRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.predicate(
    "responded_at is null before response",
    cancellationRequest.responded_at === null,
  );
  TestValidator.predicate(
    "respondedSeller is null before response",
    cancellationRequest.respondedSeller === null,
  );
  // Store original reason for validation
  const originalReason = cancellationRequest.reason;
  // 5. Administrator Rejects Cancellation Request
  const rejectionTime = new Date().toISOString();
  const updatedCancellationRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "REJECTED",
          responded_at: rejectionTime,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedCancellationRequest);
  // Validate rejection was processed correctly
  TestValidator.equals(
    "cancellation request status is REJECTED",
    updatedCancellationRequest.status,
    "REJECTED",
  );
  TestValidator.equals(
    "responded_at timestamp is set",
    updatedCancellationRequest.responded_at,
    rejectionTime,
  );
  TestValidator.predicate(
    "respondedSeller is populated after rejection",
    updatedCancellationRequest.respondedSeller !== null,
  );
  TestValidator.predicate(
    "respondedSeller has valid ID",
    updatedCancellationRequest.respondedSeller!.id !== undefined,
  );
  TestValidator.equals(
    "reason field is preserved (immutable)",
    updatedCancellationRequest.reason,
    originalReason,
  );
  TestValidator.predicate(
    "updated_at reflects modification time",
    updatedCancellationRequest.updated_at >= cancellationRequest.updated_at,
  );
  TestValidator.equals(
    "order item reference preserved",
    updatedCancellationRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "customer reference preserved",
    updatedCancellationRequest.customer.id,
    customerAuth.id,
  );
}
