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

export async function test_api_shipment_create_no_confirmation_tracking_null(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (join provides authenticated token on the same connection).
  const userConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(userConnection, {});
  typia.assert(memberAuth);
  // 2) Prepare an order with eligible order items.
  const order = await generate_random_shopping_mall_member_orders_create(
    userConnection,
    {},
  );
  typia.assert(order);
  // Pick a single order item to ensure seller_snapshot_id consistency.
  const eligibleOrderItem = order.orderItems[0];
  const sellerSnapshotId = eligibleOrderItem.seller_snapshot_id;
  const shipment = await api.functional.shoppingMall.member.shipments.create(
    userConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_ids: [eligibleOrderItem.id],
        shipment_confirmation: null,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 4) Validate tracking is null and order-item linkage is updated.
  TestValidator.equals(
    "shipment tracking should be null",
    shipment.tracking,
    null,
  );
  TestValidator.equals(
    "sellerSnapshotId matches",
    shipment.sellerSnapshotId,
    sellerSnapshotId,
  );
  TestValidator.predicate(
    "shipment has order items",
    shipment.orderItems.length > 0,
  );
  TestValidator.equals(
    "order item shipment id updated",
    shipment.orderItems[0]?.shopping_mall_shipment_id,
    shipment.id,
  );
}
