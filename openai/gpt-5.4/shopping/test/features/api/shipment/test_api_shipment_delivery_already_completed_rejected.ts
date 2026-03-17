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

export async function test_api_shipment_delivery_already_completed_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const created = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(created);
  const firstUpdateBody = {
    delivered_at: new Date().toISOString(),
  } satisfies IShoppingMallShipment.IUpdate;
  const completed = await api.functional.shoppingMall.seller.shipments.update(
    sellerConnection,
    {
      shipmentId: created.id,
      body: firstUpdateBody,
    },
  );
  typia.assert(completed);
  TestValidator.equals(
    "shipment id unchanged after first completion",
    completed.id,
    created.id,
  );
  TestValidator.equals(
    "order id unchanged after first completion",
    completed.order.id,
    created.order.id,
  );
  TestValidator.equals(
    "seller id unchanged after first completion",
    completed.seller.id,
    created.seller.id,
  );
  TestValidator.equals(
    "tracking carrier unchanged after first completion",
    completed.trackingInfo.carrier_name,
    created.trackingInfo.carrier_name,
  );
  TestValidator.equals(
    "tracking number unchanged after first completion",
    completed.trackingInfo.tracking_number,
    created.trackingInfo.tracking_number,
  );
  TestValidator.equals(
    "tracking url unchanged after first completion",
    completed.trackingInfo.tracking_url,
    created.trackingInfo.tracking_url,
  );
  TestValidator.equals(
    "order item count unchanged after first completion",
    completed.orderItems.length,
    created.orderItems.length,
  );
  TestValidator.equals(
    "order item ids unchanged after first completion",
    completed.orderItems.map((item) => item.id),
    created.orderItems.map((item) => item.id),
  );
  TestValidator.predicate(
    "shipment delivered_at populated after first completion",
    completed.delivered_at !== null,
  );
  for (const item of completed.orderItems) {
    TestValidator.predicate(
      `order item ${item.id} references the same shipment`,
      item.shipment !== null && item.shipment.id === completed.id,
    );
    TestValidator.predicate(
      `order item ${item.id} delivered_at populated`,
      item.delivered_at !== null,
    );
  }
  const secondUpdateBody = {
    delivered_at: new Date(Date.now() + 1000).toISOString(),
  } satisfies IShoppingMallShipment.IUpdate;
  await TestValidator.error(
    "duplicate shipment delivery confirmation is rejected after completion",
    async () => {
      await api.functional.shoppingMall.seller.shipments.update(
        sellerConnection,
        {
          shipmentId: created.id,
          body: secondUpdateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "completed shipment tracking carrier preserved as baseline",
    completed.trackingInfo.carrier_name,
    created.trackingInfo.carrier_name,
  );
  TestValidator.equals(
    "completed shipment tracking number preserved as baseline",
    completed.trackingInfo.tracking_number,
    created.trackingInfo.tracking_number,
  );
  TestValidator.equals(
    "completed shipment tracking url preserved as baseline",
    completed.trackingInfo.tracking_url,
    created.trackingInfo.tracking_url,
  );
  TestValidator.equals(
    "completed shipment order item ids preserved as baseline",
    completed.orderItems.map((item) => item.id),
    created.orderItems.map((item) => item.id),
  );
}
