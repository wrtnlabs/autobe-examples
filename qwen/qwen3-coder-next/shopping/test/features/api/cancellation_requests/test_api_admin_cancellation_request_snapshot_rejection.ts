import api from "@ORGANIZATION/PROJECT-api";
import type { IArrayIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IArrayIEcommerceMallCancellationRequestSnapshot";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_admin_cancellation_request_snapshot_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authentication connections for each actor
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name() + " Shop",
    },
  });
  // 2. Create order from customer
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // Get first order item for cancellation request
  if (!order.order_items || order.order_items.length === 0) {
    throw new Error("Order must have at least one item");
  }
  const orderItem = order.order_items[0];
  typia.assert(orderItem);
  // 3. Customer submits cancellation request
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          reason: "Changed mind about purchase",
          status: "pending",
          order_item_id: orderItem.id,
          seller_id: orderItem.seller.id,
          customer_id: order.customer.id,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 4. Seller rejects cancellation request
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.orders.items.cancel.reject(
      sellerConnection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: {
          reason: "Product already shipped, cannot cancel",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  // 5. Admin retrieves cancellation request snapshots
  const snapshots =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.at(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(snapshots);
  // 6. Validate snapshot array
  const snapshotArray: any[] = JSON.parse(snapshots.value);
  TestValidator.predicate("snapshots exist", snapshotArray.length >= 2);
  // Check for creation snapshot (status 'pending')
  const creationSnapshot = snapshotArray.find(
    (s: any) =>
      s.status === "pending" && s.reason === "Changed mind about purchase",
  );
  TestValidator.predicate(
    "creation snapshot exists",
    creationSnapshot !== undefined,
  );
  // Check for rejection snapshot (status 'rejected')
  const rejectionSnapshot = snapshotArray.find(
    (s: any) =>
      s.status === "rejected" &&
      s.reason === "Product already shipped, cannot cancel",
  );
  TestValidator.predicate(
    "rejection snapshot exists",
    rejectionSnapshot !== undefined,
  );
  // Verify snapshot timestamps are in correct order
  TestValidator.predicate(
    "creation before rejection",
    creationSnapshot !== undefined &&
      rejectionSnapshot !== undefined &&
      new Date(creationSnapshot.created_at) <=
        new Date(rejectionSnapshot.created_at),
  );
}
