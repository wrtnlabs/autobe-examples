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

export async function test_api_tracking_info_update_duplicate_tracking_set_conflict(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  typia.assert(
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    }),
  );
  const firstShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {},
    );
  typia.assert(firstShipment);
  const secondShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {},
    );
  typia.assert(secondShipment);
  const firstTracking = firstShipment.trackingInfo;
  const secondTracking = secondShipment.trackingInfo;
  TestValidator.notEquals(
    "shipments are different",
    firstShipment.id,
    secondShipment.id,
  );
  TestValidator.notEquals(
    "tracking records are different",
    firstTracking.id,
    secondTracking.id,
  );
  TestValidator.notEquals(
    "original first pair differs from existing second pair",
    `${firstTracking.carrier_name}:${firstTracking.tracking_number}`,
    `${secondTracking.carrier_name}:${secondTracking.tracking_number}`,
  );
  TestValidator.equals(
    "first tracking belongs to first shipment",
    firstTracking.shipment.id,
    firstShipment.id,
  );
  TestValidator.equals(
    "second tracking belongs to second shipment",
    secondTracking.shipment.id,
    secondShipment.id,
  );
  const conflictBody = {
    carrier_name: secondTracking.carrier_name,
    tracking_number: secondTracking.tracking_number,
    tracking_url: secondTracking.tracking_url,
  } satisfies IShoppingMallTrackingInfo.IUpdate;
  TestValidator.equals(
    "conflicting carrier matches second shipment carrier",
    conflictBody.carrier_name,
    secondTracking.carrier_name,
  );
  TestValidator.equals(
    "conflicting tracking number matches second shipment tracking number",
    conflictBody.tracking_number,
    secondTracking.tracking_number,
  );
  TestValidator.notEquals(
    "conflicting pair differs from first shipment original pair",
    `${conflictBody.carrier_name}:${conflictBody.tracking_number}`,
    `${firstTracking.carrier_name}:${firstTracking.tracking_number}`,
  );
  await TestValidator.httpError(
    "duplicate carrier and tracking number update must conflict",
    [400, 409],
    async () => {
      await api.functional.shoppingMall.seller.shipments.trackingInfos.update(
        sellerConnection,
        {
          shipmentId: firstShipment.id,
          trackingInfoId: firstTracking.id,
          body: conflictBody,
        },
      );
    },
  );
  TestValidator.equals(
    "first shipment still has one tracking record id",
    firstShipment.trackingInfo.id,
    firstTracking.id,
  );
  TestValidator.equals(
    "first tracking carrier preserved in captured state",
    firstTracking.carrier_name,
    firstShipment.trackingInfo.carrier_name,
  );
  TestValidator.equals(
    "first tracking number preserved in captured state",
    firstTracking.tracking_number,
    firstShipment.trackingInfo.tracking_number,
  );
  TestValidator.equals(
    "first tracking url preserved in captured state",
    firstTracking.tracking_url,
    firstShipment.trackingInfo.tracking_url,
  );
  TestValidator.equals(
    "second shipment still has one tracking record id",
    secondShipment.trackingInfo.id,
    secondTracking.id,
  );
  TestValidator.equals(
    "second tracking carrier unchanged in captured state",
    secondTracking.carrier_name,
    secondShipment.trackingInfo.carrier_name,
  );
  TestValidator.equals(
    "second tracking number unchanged in captured state",
    secondTracking.tracking_number,
    secondShipment.trackingInfo.tracking_number,
  );
}
