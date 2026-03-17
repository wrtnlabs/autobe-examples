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

export async function test_api_shipment_delete_other_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const sellerOwnerConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerOwner = await authorize_seller_join(sellerOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerOwner);
  const createdShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerOwnerConnection,
      {},
    );
  typia.assert(createdShipment);
  const shipmentId = createdShipment.id;
  const ownerSellerId = createdShipment.seller.id;
  const orderId = createdShipment.order.id;
  const trackingInfoId = createdShipment.trackingInfo.id;
  const carrierName = createdShipment.trackingInfo.carrier_name;
  const trackingNumber = createdShipment.trackingInfo.tracking_number;
  const trackingUrl = createdShipment.trackingInfo.tracking_url;
  const createdOrderItems = createdShipment.orderItems;
  TestValidator.equals(
    "created shipment belongs to authenticated owner seller",
    createdShipment.seller.id,
    sellerOwner.id,
  );
  const otherSellerConnection: api.IConnection = {
    host: connection.host,
  };
  const otherSeller = await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(otherSeller);
  TestValidator.notEquals(
    "different seller identities",
    otherSeller.id,
    sellerOwner.id,
  );
  await TestValidator.httpError(
    "other seller cannot delete shipment they do not own",
    403,
    async () => {
      await api.functional.shoppingMall.seller.shipments.erase(
        otherSellerConnection,
        {
          shipmentId,
        },
      );
    },
  );
  TestValidator.equals(
    "shipment id remains unchanged",
    createdShipment.id,
    shipmentId,
  );
  TestValidator.equals(
    "shipment seller remains owner",
    createdShipment.seller.id,
    ownerSellerId,
  );
  TestValidator.equals(
    "shipment order remains same",
    createdShipment.order.id,
    orderId,
  );
  TestValidator.equals(
    "tracking info id remains unchanged",
    createdShipment.trackingInfo.id,
    trackingInfoId,
  );
  TestValidator.equals(
    "tracking carrier remains present",
    createdShipment.trackingInfo.carrier_name,
    carrierName,
  );
  TestValidator.equals(
    "tracking number remains present",
    createdShipment.trackingInfo.tracking_number,
    trackingNumber,
  );
  TestValidator.equals(
    "tracking url remains unchanged",
    createdShipment.trackingInfo.tracking_url,
    trackingUrl,
  );
  TestValidator.predicate(
    "shipment has grouped order items",
    createdOrderItems.length > 0,
  );
  for (const orderItem of createdOrderItems) {
    TestValidator.equals(
      "grouped order item still belongs to owner seller",
      orderItem.seller.id,
      ownerSellerId,
    );
    TestValidator.predicate(
      "grouped order item still references a shipment",
      orderItem.shipment !== null,
    );
    TestValidator.equals(
      "grouped order item shipment reference remains same",
      orderItem.shipment!.id,
      shipmentId,
    );
  }
}
