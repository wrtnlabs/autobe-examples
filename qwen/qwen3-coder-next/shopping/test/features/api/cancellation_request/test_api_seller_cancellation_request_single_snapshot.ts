import api from "@ORGANIZATION/PROJECT-api";
import type { IArrayIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IArrayIEcommerceMallCancellationRequestSnapshot";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test seller retrieval of cancellation request snapshots.
 * Setup: Create seller, product, customer, order, cancellation request, then approve request.
 * Test: Seller retrieves snapshots and verifies the approval snapshot exists.
 * Validation: Snapshot contains correct request reason, status 'approved', approval timestamp, and seller ID.
 */
export async function test_api_seller_cancellation_request_single_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and product setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32">
        >() satisfies number as number,
        is_available: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 2. Customer registration and order placement
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(customerAuth);
  const order: IEcommerceMallOrder =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // Verify order belongs to customer
  TestValidator.equals(
    "order belongs to customer",
    order.customer.id,
    customerAuth.customer.id,
  );
  // Ensure order has items
  TestValidator.predicate("order has items", order.order_items.length > 0);
  const orderItem = order.order_items[0];
  // 3. Create cancellation request
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "pending" as const,
          order_item_id: orderItem.id,
          seller_id: product.seller.id,
          customer_id: customerAuth.customer.id,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Verify request is pending
  TestValidator.equals(
    "request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 4. Seller approves cancellation (creates snapshot)
  await api.functional.ecommerceMall.seller.orders.items.cancel.approve.approveCancellation(
    sellerConnection,
    {
      orderId: order.id,
      orderItemId: orderItem.id,
    },
  );
  // 5. Retrieve snapshots
  const snapshotsResponse: IArrayIEcommerceMallCancellationRequestSnapshot =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(snapshotsResponse);
  // Parse the snapshot JSON string
  const snapshots = JSON.parse(snapshotsResponse.value) as Array<{
    reason: string;
    status: "pending" | "approved" | "rejected";
    responded_at: string | null;
    seller_id: string;
  }>;
  // 6. Validate snapshots
  TestValidator.equals("exactly one snapshot exists", snapshots.length, 1);
  const snapshot = snapshots[0];
  TestValidator.equals(
    "snapshot reason matches request",
    snapshot.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.status,
    "approved",
  );
  TestValidator.predicate(
    "snapshot has approval timestamp",
    () => snapshot.responded_at !== null && snapshot.responded_at !== undefined,
  );
  TestValidator.equals(
    "snapshot seller ID matches",
    snapshot.seller_id,
    sellerAuth.id,
  );
}
