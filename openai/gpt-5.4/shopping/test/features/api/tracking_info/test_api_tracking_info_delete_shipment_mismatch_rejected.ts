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

export async function test_api_tracking_info_delete_shipment_mismatch_rejected(
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
  const expectedFirstShipmentId = firstShipment.id;
  const expectedFirstTrackingInfoId = firstShipment.trackingInfo.id;
  const expectedFirstTrackingShipmentId =
    firstShipment.trackingInfo.shipment.id;
  TestValidator.equals(
    "first shipment belongs to authenticated seller",
    firstShipment.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "second shipment belongs to authenticated seller",
    secondShipment.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "first shipment owns its tracking info",
    firstShipment.trackingInfo.shipment.id,
    firstShipment.id,
  );
  TestValidator.equals(
    "second shipment owns its tracking info",
    secondShipment.trackingInfo.shipment.id,
    secondShipment.id,
  );
  TestValidator.notEquals(
    "shipments must differ",
    firstShipment.id,
    secondShipment.id,
  );
  TestValidator.notEquals(
    "tracking infos must differ",
    firstShipment.trackingInfo.id,
    secondShipment.trackingInfo.id,
  );
  await TestValidator.httpError(
    "reject deleting tracking info with mismatched shipment id",
    [400, 404, 409],
    async () => {
      await api.functional.shoppingMall.seller.shipments.trackingInfos.erase(
        sellerConnection,
        {
          shipmentId: secondShipment.id,
          trackingInfoId: firstShipment.trackingInfo.id,
        },
      );
    },
  );
  TestValidator.equals(
    "original tracking info id remains intact after rejection",
    firstShipment.trackingInfo.id,
    expectedFirstTrackingInfoId,
  );
  TestValidator.equals(
    "original tracking-shipment relation remains intact after rejection",
    firstShipment.trackingInfo.shipment.id,
    expectedFirstTrackingShipmentId,
  );
  TestValidator.equals(
    "original shipment id remains intact after rejection",
    firstShipment.id,
    expectedFirstShipmentId,
  );
}
