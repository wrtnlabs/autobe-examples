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

export async function test_api_shipment_create_same_seller_bundle_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
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
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  TestValidator.equals(
    "tracking info references same shipment id",
    shipment.trackingInfo.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking info order matches shipment order",
    shipment.trackingInfo.shipment.order.id,
    shipment.order.id,
  );
  TestValidator.equals(
    "tracking info seller matches shipment seller",
    shipment.trackingInfo.shipment.seller.id,
    shipment.seller.id,
  );
  TestValidator.equals(
    "delivered_at is null on shipment creation",
    shipment.delivered_at,
    null,
  );
  TestValidator.predicate(
    "shipped_at is populated",
    shipment.shipped_at.length > 0,
  );
  TestValidator.predicate(
    "auto_deliver_at is populated",
    shipment.auto_deliver_at.length > 0,
  );
  TestValidator.predicate(
    "auto deliver is scheduled after shipment time",
    Date.parse(shipment.auto_deliver_at) >= Date.parse(shipment.shipped_at),
  );
  TestValidator.predicate(
    "shipment has grouped order items",
    shipment.orderItems.length > 0,
  );
  TestValidator.predicate(
    "carrier name is populated at shipment level",
    shipment.trackingInfo.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "tracking number is populated at shipment level",
    shipment.trackingInfo.tracking_number.length > 0,
  );
  const bundledStatus = shipment.orderItems[0]?.status ?? "";
  TestValidator.predicate(
    "bundled item status is populated",
    bundledStatus.length > 0,
  );
  for (const item of shipment.orderItems) {
    TestValidator.equals(
      "order item references created shipment",
      item.shipment !== null ? item.shipment.id : null,
      shipment.id,
    );
    TestValidator.equals(
      "order item seller matches shipment seller",
      item.seller.id,
      shipment.seller.id,
    );
    TestValidator.equals(
      "order item order matches shipment order",
      item.order.id,
      shipment.order.id,
    );
    TestValidator.equals(
      "order item delivered_at remains null at shipment creation",
      item.delivered_at,
      null,
    );
    TestValidator.equals(
      "all bundled items share the same advanced status",
      item.status,
      bundledStatus,
    );
  }
}
