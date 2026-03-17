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

export async function test_api_tracking_info_update_with_shipment_mismatch(
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
  const shipmentA = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipmentA);
  const shipmentB = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipmentB);
  TestValidator.notEquals(
    "shipment ids must differ",
    shipmentA.id,
    shipmentB.id,
  );
  TestValidator.notEquals(
    "tracking ids must differ",
    shipmentA.trackingInfo.id,
    shipmentB.trackingInfo.id,
  );
  TestValidator.equals(
    "shipment A owns tracking A",
    shipmentA.trackingInfo.shipment.id,
    shipmentA.id,
  );
  TestValidator.equals(
    "shipment B owns tracking B",
    shipmentB.trackingInfo.shipment.id,
    shipmentB.id,
  );
  const originalTrackingA = {
    id: shipmentA.trackingInfo.id,
    shipmentId: shipmentA.trackingInfo.shipment.id,
    carrier_name: shipmentA.trackingInfo.carrier_name,
    tracking_number: shipmentA.trackingInfo.tracking_number,
    tracking_url: shipmentA.trackingInfo.tracking_url,
  };
  const originalTrackingB = {
    id: shipmentB.trackingInfo.id,
    shipmentId: shipmentB.trackingInfo.shipment.id,
    carrier_name: shipmentB.trackingInfo.carrier_name,
    tracking_number: shipmentB.trackingInfo.tracking_number,
    tracking_url: shipmentB.trackingInfo.tracking_url,
  };
  const body = {
    carrier_name: RandomGenerator.name(),
    tracking_number: RandomGenerator.alphaNumeric(16),
    tracking_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallTrackingInfo.IUpdate;
  await TestValidator.error(
    "reject update when tracking info belongs to another shipment",
    async () => {
      await api.functional.shoppingMall.seller.shipments.trackingInfos.update(
        sellerConnection,
        {
          shipmentId: shipmentA.id,
          trackingInfoId: shipmentB.trackingInfo.id,
          body,
        },
      );
    },
  );
  TestValidator.equals(
    "shipment A tracking id unchanged",
    shipmentA.trackingInfo.id,
    originalTrackingA.id,
  );
  TestValidator.equals(
    "shipment A tracking shipment relation unchanged",
    shipmentA.trackingInfo.shipment.id,
    originalTrackingA.shipmentId,
  );
  TestValidator.equals(
    "shipment A carrier unchanged",
    shipmentA.trackingInfo.carrier_name,
    originalTrackingA.carrier_name,
  );
  TestValidator.equals(
    "shipment A tracking number unchanged",
    shipmentA.trackingInfo.tracking_number,
    originalTrackingA.tracking_number,
  );
  TestValidator.equals(
    "shipment A tracking url unchanged",
    shipmentA.trackingInfo.tracking_url,
    originalTrackingA.tracking_url,
  );
  TestValidator.equals(
    "shipment B tracking id unchanged",
    shipmentB.trackingInfo.id,
    originalTrackingB.id,
  );
  TestValidator.equals(
    "shipment B tracking shipment relation unchanged",
    shipmentB.trackingInfo.shipment.id,
    originalTrackingB.shipmentId,
  );
  TestValidator.equals(
    "shipment B carrier unchanged",
    shipmentB.trackingInfo.carrier_name,
    originalTrackingB.carrier_name,
  );
  TestValidator.equals(
    "shipment B tracking number unchanged",
    shipmentB.trackingInfo.tracking_number,
    originalTrackingB.tracking_number,
  );
  TestValidator.equals(
    "shipment B tracking url unchanged",
    shipmentB.trackingInfo.tracking_url,
    originalTrackingB.tracking_url,
  );
}
