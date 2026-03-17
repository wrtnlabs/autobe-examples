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

export async function test_api_shipment_delivery_scope_limited_to_grouped_items(
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
  const createdShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {},
    );
  typia.assert(createdShipment);
  TestValidator.predicate(
    "created shipment has grouped order items",
    createdShipment.orderItems.length > 0,
  );
  TestValidator.equals(
    "created shipment seller matches authorized seller",
    createdShipment.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "created shipment starts undelivered",
    createdShipment.delivered_at,
    null,
  );
  const deliveredAt = new Date().toISOString();
  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: createdShipment.id,
        body: {
          delivered_at: deliveredAt,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  TestValidator.equals(
    "shipment id unchanged after delivery confirmation",
    updatedShipment.id,
    createdShipment.id,
  );
  TestValidator.equals(
    "shipment order unchanged after delivery confirmation",
    updatedShipment.order.id,
    createdShipment.order.id,
  );
  TestValidator.equals(
    "shipment seller unchanged after delivery confirmation",
    updatedShipment.seller.id,
    createdShipment.seller.id,
  );
  TestValidator.predicate(
    "shipment is marked delivered",
    updatedShipment.delivered_at !== null,
  );
  TestValidator.equals(
    "grouped order item count unchanged",
    updatedShipment.orderItems.length,
    createdShipment.orderItems.length,
  );
  for (const item of updatedShipment.orderItems) {
    TestValidator.equals(
      "grouped item seller remains seller-bounded",
      item.seller.id,
      updatedShipment.seller.id,
    );
    TestValidator.equals(
      "grouped item belongs to same order",
      item.order.id,
      updatedShipment.order.id,
    );
    TestValidator.predicate(
      "grouped item still references target shipment",
      item.shipment !== null && item.shipment.id === updatedShipment.id,
    );
    TestValidator.equals(
      "grouped item delivered_at matches shipment delivered_at",
      item.delivered_at,
      updatedShipment.delivered_at,
    );
  }
  for (const originalItem of createdShipment.orderItems) {
    const matched = updatedShipment.orderItems.find(
      (item) => item.id === originalItem.id,
    );
    TestValidator.predicate(
      "original grouped item remains in same shipment composition",
      matched !== undefined,
    );
    if (matched !== undefined) {
      TestValidator.equals(
        "shipment membership unchanged for grouped item",
        matched.shipment !== null ? matched.shipment.id : null,
        createdShipment.id,
      );
    }
  }
}
