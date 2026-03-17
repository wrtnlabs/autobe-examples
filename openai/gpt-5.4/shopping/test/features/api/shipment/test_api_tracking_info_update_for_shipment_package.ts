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

export async function test_api_tracking_info_update_for_shipment_package(
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
  const shipment: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {},
    );
  typia.assert(shipment);
  const originalTrackingInfo: IShoppingMallTrackingInfo = shipment.trackingInfo;
  const updateBody = {
    carrier_name: `carrier-${RandomGenerator.alphabets(8)}`,
    tracking_number: `tracking-${RandomGenerator.alphaNumeric(12)}`,
    tracking_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallTrackingInfo.IUpdate;
  const updated: IShoppingMallTrackingInfo =
    await api.functional.shoppingMall.seller.shipments.trackingInfos.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        trackingInfoId: originalTrackingInfo.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "tracking info identity is preserved",
    updated.id,
    originalTrackingInfo.id,
  );
  TestValidator.equals(
    "parent shipment identity is preserved",
    updated.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "shipment order identity is preserved",
    updated.shipment.order.id,
    shipment.order.id,
  );
  TestValidator.equals(
    "shipment seller identity is preserved",
    updated.shipment.seller.id,
    shipment.seller.id,
  );
  TestValidator.equals(
    "created_at is preserved",
    updated.created_at,
    originalTrackingInfo.created_at,
  );
  TestValidator.notEquals(
    "updated_at is refreshed",
    updated.updated_at,
    originalTrackingInfo.updated_at,
  );
  TestValidator.equals(
    "carrier name updated",
    updated.carrier_name,
    updateBody.carrier_name,
  );
  TestValidator.equals(
    "tracking number updated",
    updated.tracking_number,
    updateBody.tracking_number,
  );
  TestValidator.equals(
    "tracking url updated",
    updated.tracking_url,
    updateBody.tracking_url,
  );
  for (const orderItem of shipment.orderItems) {
    TestValidator.predicate(
      "grouped order item retains shipment linkage",
      orderItem.shipment !== null,
    );
    if (orderItem.shipment !== null) {
      TestValidator.equals(
        "grouped order item shares the same shipment context",
        orderItem.shipment.id,
        shipment.id,
      );
    }
  }
}
