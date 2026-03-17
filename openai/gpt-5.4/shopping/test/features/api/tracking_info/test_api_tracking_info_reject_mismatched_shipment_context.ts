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

export async function test_api_tracking_info_reject_mismatched_shipment_context(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_join(sellerConnection, {});
  const firstShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {},
    );
  typia.assert(firstShipment);
  const firstTrackingInfo = typia.assert(firstShipment.trackingInfo);
  const secondShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {},
    );
  typia.assert(secondShipment);
  const secondTrackingInfo = typia.assert(secondShipment.trackingInfo);
  const firstTrackingInfoRead =
    await api.functional.shoppingMall.seller.shipments.trackingInfos.at(
      sellerConnection,
      {
        shipmentId: firstShipment.id,
        trackingInfoId: firstTrackingInfo.id,
      },
    );
  typia.assert(firstTrackingInfoRead);
  TestValidator.equals(
    "first tracking info id matches",
    firstTrackingInfoRead.id,
    firstTrackingInfo.id,
  );
  TestValidator.equals(
    "first tracking info belongs to first shipment",
    firstTrackingInfoRead.shipment.id,
    firstShipment.id,
  );
  const secondTrackingInfoRead =
    await api.functional.shoppingMall.seller.shipments.trackingInfos.at(
      sellerConnection,
      {
        shipmentId: secondShipment.id,
        trackingInfoId: secondTrackingInfo.id,
      },
    );
  typia.assert(secondTrackingInfoRead);
  TestValidator.equals(
    "second tracking info id matches",
    secondTrackingInfoRead.id,
    secondTrackingInfo.id,
  );
  TestValidator.equals(
    "second tracking info belongs to second shipment",
    secondTrackingInfoRead.shipment.id,
    secondShipment.id,
  );
  await TestValidator.httpError(
    "reject mismatched shipment and tracking info context",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipments.trackingInfos.at(
        sellerConnection,
        {
          shipmentId: firstShipment.id,
          trackingInfoId: secondTrackingInfo.id,
        },
      );
    },
  );
}
