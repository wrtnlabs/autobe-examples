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

export async function test_api_tracking_info_create_for_seller_shipment(
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
    },
  });
  typia.assert(seller);
  const trackingBody = {
    carrier_name: `carrier-${RandomGenerator.alphabets(6)}`,
    tracking_number: `trk-${RandomGenerator.alphabets(12)}`,
    tracking_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallTrackingInfo.ICreate;
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        trackingInfo: trackingBody,
      },
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment seller matches authenticated seller",
    shipment.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "tracking belongs to same shipment",
    shipment.trackingInfo.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking carrier name preserved",
    shipment.trackingInfo.carrier_name,
    trackingBody.carrier_name,
  );
  TestValidator.equals(
    "tracking number preserved",
    shipment.trackingInfo.tracking_number,
    trackingBody.tracking_number,
  );
  TestValidator.equals(
    "tracking url preserved",
    shipment.trackingInfo.tracking_url,
    trackingBody.tracking_url ?? null,
  );
  TestValidator.equals(
    "tracking shipment summary seller matches shipment seller",
    shipment.trackingInfo.shipment.seller.id,
    shipment.seller.id,
  );
  TestValidator.equals(
    "tracking shipment summary order matches shipment order",
    shipment.trackingInfo.shipment.order.id,
    shipment.order.id,
  );
  TestValidator.predicate(
    "shipment groups at least one order item",
    shipment.orderItems.length >= 1,
  );
  TestValidator.predicate(
    "all grouped order items belong to created shipment when shipment relation is present",
    shipment.orderItems.every(
      (orderItem) =>
        orderItem.shipment === null || orderItem.shipment.id === shipment.id,
    ),
  );
  TestValidator.predicate(
    "all grouped order items belong to the same seller",
    shipment.orderItems.every(
      (orderItem) => orderItem.seller.id === shipment.seller.id,
    ),
  );
  const duplicateTrackingBody = {
    carrier_name: `carrier-${RandomGenerator.alphabets(6)}`,
    tracking_number: `trk-${RandomGenerator.alphabets(12)}`,
    tracking_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallTrackingInfo.ICreate;
  await TestValidator.error(
    "cannot create another shipment-level tracking info for the same shipment",
    async () => {
      await generate_random_shopping_mall_seller_shipments_tracking_infos_create(
        sellerConnection,
        {
          params: {
            shipmentId: shipment.id,
          },
          body: duplicateTrackingBody,
        },
      );
    },
  );
}
