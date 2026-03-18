import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_create_bundled_items_with_initial_tracking(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallMember.IJoin;
  await authorize_member_join(memberConnection, { body: credentials });
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  const eligibleOrderItems = order.orderItems.filter(
    (item) => item.shopping_mall_shipment_id === null,
  );
  TestValidator.predicate(
    "has at least 2 eligible order items",
    () => eligibleOrderItems.length >= 2,
  );
  const selectedOrderItems = eligibleOrderItems.slice(0, 2);
  const sellerSnapshotId = selectedOrderItems[0].seller_snapshot_id;
  for (const item of selectedOrderItems) {
    TestValidator.equals(
      "seller_snapshot_id is same within selected items",
      item.seller_snapshot_id,
      sellerSnapshotId,
    );
  }
  const confirmedAt = new Date().toISOString();
  const trackingUrl = `https://track.example/${typia.random<string & tags.Format<"uuid">>()}`;
  const shoppingMallShipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipmentConfirmation: IShoppingMallShipmentConfirmation.ICreate = {
    shoppingMallShipmentId,
    confirmationType: "initial_confirmation",
    confirmedAt,
    trackingUrl: trackingUrl satisfies string & tags.Format<"url">,
    trackingNumber: typia.random<string>(),
    carrierName: RandomGenerator.name(),
    note: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const createBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_ids: selectedOrderItems.map((x) => x.id),
    shipment_confirmation: shipmentConfirmation,
  } satisfies IShoppingMallShipment.ICreate;
  const shipment = await api.functional.shoppingMall.member.shipments.create(
    memberConnection,
    { body: createBody },
  );
  typia.assert(shipment);
  TestValidator.predicate("shipment id exists", () => shipment.id.length > 0);
  TestValidator.equals(
    "sellerSnapshotId matches selected seller_snapshot_id",
    shipment.sellerSnapshotId,
    sellerSnapshotId,
  );
  TestValidator.equals(
    "response.order.id matches order.id",
    shipment.order.id,
    order.id,
  );
  const shipmentOrderItemsById = new Map(
    shipment.orderItems.map((oi) => [oi.id, oi]),
  );
  for (const selected of selectedOrderItems) {
    const fromResponse = shipmentOrderItemsById.get(selected.id);
    TestValidator.predicate(
      `order item ${selected.id} is included in response`,
      () => fromResponse !== undefined,
    );
    if (!fromResponse) continue;
    TestValidator.equals(
      "shopping_mall_shipment_id populated",
      fromResponse.shopping_mall_shipment_id,
      shipment.id,
    );
  }
  TestValidator.predicate(
    "tracking is non-null",
    () => shipment.tracking !== null,
  );
  const tracking = typia.assert(shipment.tracking!);
  // DTO typing declares these fields as null, so compile-safe assertions are
  // to validate they are null.
  TestValidator.equals(
    "tracking.confirmationType is null",
    tracking.confirmationType,
    null,
  );
  TestValidator.equals(
    "tracking.confirmedAt is null",
    tracking.confirmedAt,
    null,
  );
  TestValidator.equals(
    "tracking.trackingUrl is null",
    tracking.trackingUrl,
    null,
  );
  TestValidator.equals(
    "tracking.trackingNumber is null",
    tracking.trackingNumber,
    null,
  );
  TestValidator.equals(
    "tracking.carrierName is null",
    tracking.carrierName,
    null,
  );
  TestValidator.equals("tracking.note is null", tracking.note, null);
}
