import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_item_update_status_member_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a member via utility
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2) Create an order owned by this member (generation helper)
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  const lineItemBefore = order.orderItems[0];
  const orderItemId = lineItemBefore.id;
  // 3) Pick a permitted next status by trying a small set of common next states.
  const candidateStatuses = [
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  let updated: IShoppingMallOrderItem | undefined = undefined;
  let requestedStatus: string | undefined = undefined;
  for (const status of candidateStatuses) {
    try {
      const out = await api.functional.shoppingMall.member.order_items.update(
        memberConnection,
        {
          orderItemId,
          body: {
            line_item_status: status,
          } satisfies IShoppingMallOrderItem.IUpdate,
        },
      );
      typia.assert(out);
      updated = out;
      requestedStatus = status;
      break;
    } catch {
      // try next candidate
    }
  }
  if (!updated || !requestedStatus) {
    throw new Error(
      "No permitted order-item status transition found for the created order item.",
    );
  }
  // 4) Validate response business invariants
  typia.assert(updated);
  TestValidator.equals(
    "lineItemStatus equals requested status",
    updated.lineItemStatus,
    requestedStatus,
  );
  TestValidator.equals(
    "shoppingMallOrderId unchanged",
    updated.shoppingMallOrderId,
    lineItemBefore.shopping_mall_order_id,
  );
  TestValidator.equals(
    "shoppingMallProductVariantId unchanged",
    updated.shoppingMallProductVariantId,
    lineItemBefore.shopping_mall_product_variant_id,
  );
  TestValidator.equals(
    "sellerSnapshotId unchanged",
    updated.sellerSnapshotId,
    lineItemBefore.seller_snapshot_id,
  );
  TestValidator.equals(
    "quantity unchanged",
    updated.quantity,
    lineItemBefore.quantity,
  );
  TestValidator.predicate(
    "updatedAt is later than before",
    new Date(updated.updatedAt).getTime() >
      new Date(lineItemBefore.updated_at).getTime(),
  );
  // 5) Consistency: shipment linkage preserved
  TestValidator.equals(
    "shoppingMallShipmentId preserved",
    updated.shoppingMallShipmentId,
    lineItemBefore.shopping_mall_shipment_id,
  );
  // 6) Negative authorization: other member cannot update this member's order item
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherAuth = await authorize_member_join(otherMemberConnection, {});
  typia.assert(otherAuth);
  await TestValidator.error(
    "only owning member can update order item",
    async () => {
      await api.functional.shoppingMall.member.order_items.update(
        otherMemberConnection,
        {
          orderItemId,
          body: {
            line_item_status: requestedStatus,
          } satisfies IShoppingMallOrderItem.IUpdate,
        },
      );
    },
  );
}
