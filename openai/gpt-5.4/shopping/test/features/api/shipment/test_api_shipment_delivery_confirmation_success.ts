import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_tracking_info } from "../../../prepare/prepare_random_shopping_mall_tracking_info";

export async function test_api_shipment_delivery_confirmation_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const created: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {},
    );
  typia.assert(created);
  TestValidator.equals(
    "shipment starts undelivered",
    created.delivered_at,
    null,
  );
  TestValidator.predicate(
    "shipment contains grouped order items",
    created.orderItems.length > 0,
  );
  const createdOrderItemIds = created.orderItems.map((item) => item.id).sort();
  const deliveredAt = new Date().toISOString();
  const body = {
    delivered_at: deliveredAt,
  } satisfies IShoppingMallShipment.IUpdate;
  const updated: IShoppingMallShipment =
    await api.functional.shoppingMall.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: created.id,
        body,
      },
    );
  typia.assert(updated);
  TestValidator.equals("shipment id is preserved", updated.id, created.id);
  TestValidator.equals(
    "order summary is preserved",
    updated.order,
    created.order,
  );
  TestValidator.equals(
    "seller summary is preserved",
    updated.seller,
    created.seller,
  );
  TestValidator.equals(
    "tracking info id is preserved",
    updated.trackingInfo.id,
    created.trackingInfo.id,
  );
  TestValidator.equals(
    "tracking info shipment id is preserved",
    updated.trackingInfo.shipment.id,
    created.trackingInfo.shipment.id,
  );
  TestValidator.equals(
    "tracking carrier name is preserved",
    updated.trackingInfo.carrier_name,
    created.trackingInfo.carrier_name,
  );
  TestValidator.equals(
    "tracking number is preserved",
    updated.trackingInfo.tracking_number,
    created.trackingInfo.tracking_number,
  );
  TestValidator.equals(
    "tracking url is preserved",
    updated.trackingInfo.tracking_url,
    created.trackingInfo.tracking_url,
  );
  TestValidator.equals(
    "shipment delivered_at is updated",
    updated.delivered_at,
    deliveredAt,
  );
  TestValidator.equals(
    "grouped order item count is preserved",
    updated.orderItems.length,
    created.orderItems.length,
  );
  const updatedOrderItemIds = updated.orderItems.map((item) => item.id).sort();
  TestValidator.equals(
    "same grouped order items remain in shipment",
    updatedOrderItemIds,
    createdOrderItemIds,
  );
  for (const item of updated.orderItems) {
    if (item.shipment !== null) {
      TestValidator.equals(
        "order item shipment id remains same",
        item.shipment.id,
        updated.id,
      );
    }
    TestValidator.equals(
      "order item delivered_at follows shipment delivery confirmation",
      item.delivered_at,
      deliveredAt,
    );
    TestValidator.equals(
      "order item status becomes delivered",
      item.status,
      "delivered",
    );
  }
}
