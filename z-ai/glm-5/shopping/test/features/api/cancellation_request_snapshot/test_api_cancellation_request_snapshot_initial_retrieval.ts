import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_order_items_cancellation_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_request_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test validates the primary success path for retrieving a cancellation request snapshot.
 * A customer who initiated a cancellation request retrieves the initial snapshot record
 * to view the complete state transition details.
 *
 * Test Flow:
 * 1. Customer registers and authenticates
 * 2. Seller registers and creates a product with variants and inventory
 * 3. Customer places an order, creating order items with 'paid' status
 * 4. Customer creates a cancellation request for one order item
 * 5. System automatically creates an initial snapshot
 * 6. Customer retrieves the snapshot via the target API
 *
 * Validations:
 * - previousStatus is null (initial submission snapshot)
 * - newStatus is 'pending'
 * - reason matches the customer's submitted reason
 * - sellerResponse is null (seller has not responded)
 * - rejectionReason is null
 */
export async function test_api_cancellation_request_snapshot_initial_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product with variants and inventory
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Customer places an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 5. Get the first order item (should have 'paid' status)
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 6. Customer creates a cancellation request with specific reason
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_request_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
        body: { reason: cancellationReason },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Get the initial snapshot from the cancellation request
  const snapshot = cancellationRequest.snapshots[0];
  typia.assert(snapshot);
  // 8. Retrieve the snapshot using the target API
  const retrievedSnapshot =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 9. Validate the snapshot structure and values
  TestValidator.equals(
    "previousStatus is null for initial snapshot",
    retrievedSnapshot.previousStatus,
    null,
  );
  TestValidator.equals(
    "newStatus is pending",
    retrievedSnapshot.newStatus,
    "pending",
  );
  TestValidator.equals(
    "reason matches submitted reason",
    retrievedSnapshot.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "sellerResponse is null for initial snapshot",
    retrievedSnapshot.sellerResponse,
    null,
  );
  TestValidator.equals(
    "rejectionReason is null",
    retrievedSnapshot.rejectionReason,
    null,
  );
}
