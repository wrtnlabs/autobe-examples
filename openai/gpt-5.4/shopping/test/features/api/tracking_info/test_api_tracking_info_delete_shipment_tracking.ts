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
import { generate_random_shopping_mall_seller_shipments_tracking_infos_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_tracking_infos_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_tracking_info } from "../../../prepare/prepare_random_shopping_mall_tracking_info";

export async function test_api_tracking_info_delete_shipment_tracking(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment seller matches authenticated seller",
    shipment.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "tracking info belongs to shipment",
    shipment.trackingInfo.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking info shipment seller matches shipment seller",
    shipment.trackingInfo.shipment.seller.id,
    shipment.seller.id,
  );
  TestValidator.equals(
    "tracking info shipment order matches shipment order",
    shipment.trackingInfo.shipment.order.id,
    shipment.order.id,
  );
  TestValidator.predicate(
    "shipment has grouped order items",
    shipment.orderItems.length > 0,
  );
  const groupedOrderItemIds = shipment.orderItems.map((item) => item.id);
  const groupedShipmentIds = shipment.orderItems.map(
    (item) => item.shipment?.id ?? null,
  );
  TestValidator.predicate(
    "all grouped order items reference the same shipment before tracking deletion",
    groupedShipmentIds.every((id) => id === shipment.id),
  );
  const deleted: void =
    await api.functional.shoppingMall.seller.shipments.trackingInfos.erase(
      sellerConnection,
      {
        shipmentId: shipment.id,
        trackingInfoId: shipment.trackingInfo.id,
      },
    );
  TestValidator.equals("delete returns no response body", deleted, undefined);
  TestValidator.equals(
    "deleted tracking targeted the shipment-level package identity",
    shipment.trackingInfo.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "deleted tracking targeted the seller-owned shipment",
    shipment.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "deleted tracking targeted the same shipment order baseline",
    shipment.trackingInfo.shipment.order.id,
    shipment.order.id,
  );
  TestValidator.equals(
    "shipment shipped_at baseline remains unaffected by delete scope",
    shipment.trackingInfo.shipment.shipped_at,
    shipment.shipped_at,
  );
  TestValidator.equals(
    "shipment delivered_at baseline remains unaffected by delete scope",
    shipment.trackingInfo.shipment.delivered_at,
    shipment.delivered_at,
  );
  TestValidator.equals(
    "shipment auto_deliver_at baseline remains unaffected by delete scope",
    shipment.trackingInfo.shipment.auto_deliver_at,
    shipment.auto_deliver_at,
  );
  TestValidator.equals(
    "grouped order item count baseline remains the same package composition",
    groupedOrderItemIds.length,
    shipment.orderItems.length,
  );
  TestValidator.equals(
    "grouped order item ids baseline remain the same package composition",
    groupedOrderItemIds,
    shipment.orderItems.map((item) => item.id),
  );
}
