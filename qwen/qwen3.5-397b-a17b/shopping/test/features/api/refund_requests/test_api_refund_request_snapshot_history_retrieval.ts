import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
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
  // 2. Create an order with at least one item
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  // 3. Get the first order item and its shipment
  const orderItem = order.items[0]!;
  TestValidator.predicate("order item exists", orderItem !== undefined);
  // Find shipment containing this order item
  const shipment = order.shipments.find((s) =>
    s.items.some((item) => item.id === orderItem.id),
  );
  TestValidator.predicate(
    "shipment exists for order item",
    shipment !== undefined,
  );
  const shipmentId = shipment!.id;
  // 4. Confirm delivery to make the item eligible for refund
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipmentId,
      },
    );
  typia.assert(confirmedShipment);
  TestValidator.predicate(
    "delivery confirmed",
    confirmedShipment.delivery_confirmed_at !== null,
  );
  // 5. Create a refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request order item matches",
    refundRequest.order_item_id,
    orderItem.id,
  );
  TestValidator.equals(
    "refund request status is PENDING",
    refundRequest.status,
    "PENDING",
  );
  TestValidator.predicate(
    "responded_at is null",
    refundRequest.responded_at === null,
  );
  // 6. Retrieve the snapshot history for the refund request
  const snapshotResponse =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 7. Validate snapshot history
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotResponse.data.length >= 1,
  );
  TestValidator.equals(
    "pagination current page",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshotResponse.pagination.records >= 1,
  );
  // 8. Validate the first snapshot (created when refund request was submitted)
  const firstSnapshot = snapshotResponse.data[0]!;
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "snapshot status is PENDING",
    firstSnapshot.status,
    "PENDING",
  );
  TestValidator.equals(
    "snapshot reason matches",
    firstSnapshot.reason,
    refundRequest.reason,
  );
  TestValidator.predicate(
    "snapshot responded_at is null",
    firstSnapshot.responded_at === null,
  );
  TestValidator.predicate(
    "snapshot has customer info",
    firstSnapshot.customer !== undefined,
  );
  TestValidator.equals(
    "snapshot customer id matches",
    firstSnapshot.customer.id,
    customerAuth.id,
  );
  TestValidator.predicate(
    "snapshot has valid snapshot_at",
    firstSnapshot.snapshot_at !== null,
  );
  TestValidator.predicate(
    "snapshot has valid requested_at",
    firstSnapshot.requested_at !== null,
  );
  // 9. Verify snapshots are sorted by snapshot_at in descending order
  if (snapshotResponse.data.length > 1) {
    for (let i = 1; i < snapshotResponse.data.length; i++) {
      const prevSnapshot = snapshotResponse.data[i - 1]!;
      const currSnapshot = snapshotResponse.data[i]!;
      TestValidator.predicate(
        "snapshots sorted by snapshot_at desc",
        prevSnapshot.snapshot_at >= currSnapshot.snapshot_at,
      );
    }
  }
}
