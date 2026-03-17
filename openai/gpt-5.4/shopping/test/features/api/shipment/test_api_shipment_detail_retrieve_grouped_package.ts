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

export async function test_api_shipment_detail_retrieve_grouped_package(
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
  const created = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(created);
  const retrieved = await api.functional.shoppingMall.seller.shipments.at(
    sellerConnection,
    {
      shipmentId: created.id,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals("shipment id", retrieved.id, created.id);
  TestValidator.equals("order id", retrieved.order.id, created.order.id);
  TestValidator.equals("order code", retrieved.order.code, created.order.code);
  TestValidator.equals(
    "order status",
    retrieved.order.status,
    created.order.status,
  );
  TestValidator.equals(
    "order total price",
    retrieved.order.total_price,
    created.order.total_price,
  );
  TestValidator.equals(
    "order created_at",
    retrieved.order.created_at,
    created.order.created_at,
  );
  TestValidator.equals(
    "order updated_at",
    retrieved.order.updated_at,
    created.order.updated_at,
  );
  TestValidator.equals(
    "order deleted_at",
    retrieved.order.deleted_at,
    created.order.deleted_at,
  );
  TestValidator.equals(
    "seller id matches created",
    retrieved.seller.id,
    created.seller.id,
  );
  TestValidator.equals(
    "seller email",
    retrieved.seller.email,
    created.seller.email,
  );
  TestValidator.equals(
    "seller approval status",
    retrieved.seller.approval_status,
    created.seller.approval_status,
  );
  TestValidator.equals(
    "seller rejection reason",
    retrieved.seller.rejection_reason,
    created.seller.rejection_reason,
  );
  TestValidator.equals(
    "seller suspended",
    retrieved.seller.suspended,
    created.seller.suspended,
  );
  TestValidator.equals(
    "seller banned",
    retrieved.seller.banned,
    created.seller.banned,
  );
  TestValidator.equals(
    "seller created_at",
    retrieved.seller.created_at,
    created.seller.created_at,
  );
  TestValidator.equals(
    "seller updated_at",
    retrieved.seller.updated_at,
    created.seller.updated_at,
  );
  TestValidator.equals(
    "seller deleted_at",
    retrieved.seller.deleted_at,
    created.seller.deleted_at,
  );
  TestValidator.equals(
    "shipped_at unchanged",
    retrieved.shipped_at,
    created.shipped_at,
  );
  TestValidator.equals(
    "delivered_at unchanged",
    retrieved.delivered_at,
    created.delivered_at,
  );
  TestValidator.equals(
    "auto_deliver_at unchanged",
    retrieved.auto_deliver_at,
    created.auto_deliver_at,
  );
  TestValidator.equals(
    "shipment created_at unchanged",
    retrieved.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "shipment updated_at unchanged",
    retrieved.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "shipment deleted_at unchanged",
    retrieved.deleted_at,
    created.deleted_at,
  );
  TestValidator.equals(
    "tracking shipment id",
    retrieved.trackingInfo.shipment.id,
    retrieved.id,
  );
  TestValidator.equals(
    "tracking shipment id matches created",
    retrieved.trackingInfo.shipment.id,
    created.trackingInfo.shipment.id,
  );
  TestValidator.equals(
    "carrier name",
    retrieved.trackingInfo.carrier_name,
    created.trackingInfo.carrier_name,
  );
  TestValidator.equals(
    "tracking number",
    retrieved.trackingInfo.tracking_number,
    created.trackingInfo.tracking_number,
  );
  TestValidator.equals(
    "tracking url",
    retrieved.trackingInfo.tracking_url,
    created.trackingInfo.tracking_url,
  );
  TestValidator.equals(
    "tracking created_at unchanged",
    retrieved.trackingInfo.created_at,
    created.trackingInfo.created_at,
  );
  TestValidator.equals(
    "tracking updated_at unchanged",
    retrieved.trackingInfo.updated_at,
    created.trackingInfo.updated_at,
  );
  TestValidator.equals(
    "tracking deleted_at unchanged",
    retrieved.trackingInfo.deleted_at,
    created.trackingInfo.deleted_at,
  );
  TestValidator.equals(
    "order item count",
    retrieved.orderItems.length,
    created.orderItems.length,
  );
  for (const item of retrieved.orderItems) {
    const matched = created.orderItems.find(
      (candidate) => candidate.id === item.id,
    );
    if (matched === undefined) {
      throw new Error("Retrieved shipment contains an unexpected order item.");
    }
    TestValidator.equals(
      "item shipment exists",
      item.shipment?.id ?? null,
      retrieved.id,
    );
    TestValidator.equals(
      "item shipment id unchanged",
      item.shipment?.id ?? null,
      matched.shipment?.id ?? null,
    );
    TestValidator.equals("item order id", item.order.id, retrieved.order.id);
    TestValidator.equals(
      "item order id unchanged",
      item.order.id,
      matched.order.id,
    );
    TestValidator.equals("item seller id", item.seller.id, retrieved.seller.id);
    TestValidator.equals(
      "item seller id unchanged",
      item.seller.id,
      matched.seller.id,
    );
    TestValidator.equals("item status unchanged", item.status, matched.status);
    TestValidator.equals(
      "item delivered_at unchanged",
      item.delivered_at,
      matched.delivered_at,
    );
    TestValidator.equals(
      "item quantity unchanged",
      item.quantity,
      matched.quantity,
    );
    TestValidator.equals(
      "item unit_price unchanged",
      item.unit_price,
      matched.unit_price,
    );
    TestValidator.equals(
      "item created_at unchanged",
      item.created_at,
      matched.created_at,
    );
    TestValidator.equals(
      "item updated_at unchanged",
      item.updated_at,
      matched.updated_at,
    );
    TestValidator.equals(
      "item deleted_at unchanged",
      item.deleted_at,
      matched.deleted_at,
    );
  }
}
