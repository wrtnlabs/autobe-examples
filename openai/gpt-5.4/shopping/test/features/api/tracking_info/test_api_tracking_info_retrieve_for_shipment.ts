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

export async function test_api_tracking_info_retrieve_for_shipment(
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
    } satisfies IShoppingMallSeller.IJoin,
  });
  const trackingInput = {
    carrier_name: `carrier-${RandomGenerator.alphabets(8)}`,
    tracking_number: `trk-${RandomGenerator.alphaNumeric(12)}`,
    tracking_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallTrackingInfo.ICreate;
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        trackingInfo: trackingInput,
      },
    },
  );
  typia.assert(shipment);
  const originalTrackingInfo = shipment.trackingInfo;
  const originalShipmentSummary = originalTrackingInfo.shipment;
  const retrieved =
    await api.functional.shoppingMall.seller.shipments.trackingInfos.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
        trackingInfoId: originalTrackingInfo.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "tracking info id matches",
    retrieved.id,
    originalTrackingInfo.id,
  );
  TestValidator.equals(
    "shipment id matches",
    retrieved.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "carrier name persists",
    retrieved.carrier_name,
    trackingInput.carrier_name,
  );
  TestValidator.equals(
    "tracking number persists",
    retrieved.tracking_number,
    trackingInput.tracking_number,
  );
  TestValidator.equals(
    "tracking url persists",
    retrieved.tracking_url,
    trackingInput.tracking_url ?? null,
  );
  TestValidator.equals(
    "tracking created_at unchanged",
    retrieved.created_at,
    originalTrackingInfo.created_at,
  );
  TestValidator.equals(
    "tracking updated_at unchanged",
    retrieved.updated_at,
    originalTrackingInfo.updated_at,
  );
  TestValidator.equals(
    "tracking deleted_at unchanged",
    retrieved.deleted_at,
    originalTrackingInfo.deleted_at,
  );
  TestValidator.equals(
    "shipment summary id unchanged",
    retrieved.shipment.id,
    originalShipmentSummary.id,
  );
  TestValidator.equals(
    "shipment order id unchanged",
    retrieved.shipment.order.id,
    originalShipmentSummary.order.id,
  );
  TestValidator.equals(
    "shipment order code unchanged",
    retrieved.shipment.order.code,
    originalShipmentSummary.order.code,
  );
  TestValidator.equals(
    "shipment order status unchanged",
    retrieved.shipment.order.status,
    originalShipmentSummary.order.status,
  );
  TestValidator.equals(
    "shipment order total price unchanged",
    retrieved.shipment.order.total_price,
    originalShipmentSummary.order.total_price,
  );
  TestValidator.equals(
    "shipment order created_at unchanged",
    retrieved.shipment.order.created_at,
    originalShipmentSummary.order.created_at,
  );
  TestValidator.equals(
    "shipment order updated_at unchanged",
    retrieved.shipment.order.updated_at,
    originalShipmentSummary.order.updated_at,
  );
  TestValidator.equals(
    "shipment order deleted_at unchanged",
    retrieved.shipment.order.deleted_at,
    originalShipmentSummary.order.deleted_at,
  );
  TestValidator.equals(
    "shipment seller id unchanged",
    retrieved.shipment.seller.id,
    originalShipmentSummary.seller.id,
  );
  TestValidator.equals(
    "shipment seller email unchanged",
    retrieved.shipment.seller.email,
    originalShipmentSummary.seller.email,
  );
  TestValidator.equals(
    "shipment seller approval status unchanged",
    retrieved.shipment.seller.approval_status,
    originalShipmentSummary.seller.approval_status,
  );
  TestValidator.equals(
    "shipment seller rejection reason unchanged",
    retrieved.shipment.seller.rejection_reason,
    originalShipmentSummary.seller.rejection_reason,
  );
  TestValidator.equals(
    "shipment seller suspended unchanged",
    retrieved.shipment.seller.suspended,
    originalShipmentSummary.seller.suspended,
  );
  TestValidator.equals(
    "shipment seller banned unchanged",
    retrieved.shipment.seller.banned,
    originalShipmentSummary.seller.banned,
  );
  TestValidator.equals(
    "shipment seller created_at unchanged",
    retrieved.shipment.seller.created_at,
    originalShipmentSummary.seller.created_at,
  );
  TestValidator.equals(
    "shipment seller updated_at unchanged",
    retrieved.shipment.seller.updated_at,
    originalShipmentSummary.seller.updated_at,
  );
  TestValidator.equals(
    "shipment seller deleted_at unchanged",
    retrieved.shipment.seller.deleted_at,
    originalShipmentSummary.seller.deleted_at,
  );
  TestValidator.equals(
    "shipment shipped_at unchanged by retrieval",
    retrieved.shipment.shipped_at,
    originalShipmentSummary.shipped_at,
  );
  TestValidator.equals(
    "shipment delivered_at unchanged by retrieval",
    retrieved.shipment.delivered_at,
    originalShipmentSummary.delivered_at,
  );
  TestValidator.equals(
    "shipment auto_deliver_at unchanged by retrieval",
    retrieved.shipment.auto_deliver_at,
    originalShipmentSummary.auto_deliver_at,
  );
  TestValidator.equals(
    "shipment created_at unchanged by retrieval",
    retrieved.shipment.created_at,
    originalShipmentSummary.created_at,
  );
  TestValidator.equals(
    "shipment updated_at unchanged by retrieval",
    retrieved.shipment.updated_at,
    originalShipmentSummary.updated_at,
  );
  TestValidator.equals(
    "shipment deleted_at unchanged by retrieval",
    retrieved.shipment.deleted_at,
    originalShipmentSummary.deleted_at,
  );
}
