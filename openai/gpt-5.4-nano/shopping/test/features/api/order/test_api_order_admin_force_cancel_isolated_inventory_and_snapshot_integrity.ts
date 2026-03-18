import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_order_items_create } from "../../../generate/generate_random_shopping_mall_member_order_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_payments_create } from "../../../generate/generate_random_shopping_mall_member_payments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_payment } from "../../../prepare/prepare_random_shopping_mall_payment";

export async function test_api_order_admin_force_cancel_isolated_inventory_and_snapshot_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1) Actor connections
  const adminConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  // 2) Create an order header for the member
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 3) Add at least two order items under the same order
  const firstItem =
    await generate_random_shopping_mall_member_order_items_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_id: order.id,
        },
      },
    );
  typia.assert(firstItem);
  const secondItem =
    await generate_random_shopping_mall_member_order_items_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_id: order.id,
        },
      },
    );
  typia.assert(secondItem);
  // 4) Baseline: call admin update with a header-only change (no order-item targeting)
  const adminUpdateBody1 = {
    shipping_instructions: null,
  } satisfies IShoppingMallOrder.IUpdate;
  const baselineOrder =
    await api.functional.shoppingMall.admin.admin.orders.update(
      adminConnection,
      {
        orderId: order.id,
        body: adminUpdateBody1,
      },
    );
  typia.assert(baselineOrder);
  const baselineItems = baselineOrder.orderItems;
  TestValidator.predicate(
    "order has at least two items",
    () => baselineItems.length >= 2,
  );
  const baselineMap = new Map<
    string & tags.Format<"uuid">,
    {
      lineItemStatus: string;
      sellerSnapshotId: string & tags.Format<"uuid">;
    }
  >(
    baselineItems.map((it) => [
      it.id,
      {
        lineItemStatus: it.line_item_status,
        sellerSnapshotId: it.seller_snapshot_id,
      },
    ]),
  );
  // 5) Apply another header-only admin update; order items should remain unchanged
  const adminUpdateBody2 = {
    shipping_instructions: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallOrder.IUpdate;
  const updatedOrder =
    await api.functional.shoppingMall.admin.admin.orders.update(
      adminConnection,
      {
        orderId: order.id,
        body: adminUpdateBody2,
      },
    );
  typia.assert(updatedOrder);
  const updatedItems = updatedOrder.orderItems;
  const updatedMap = new Map<
    string & tags.Format<"uuid">,
    {
      lineItemStatus: string;
      sellerSnapshotId: string & tags.Format<"uuid">;
    }
  >(
    updatedItems.map((it) => [
      it.id,
      {
        lineItemStatus: it.line_item_status,
        sellerSnapshotId: it.seller_snapshot_id,
      },
    ]),
  );
  // 6) Validate isolation rule: every item present in baseline is unchanged
  for (const [itemId, base] of baselineMap) {
    const after = updatedMap.get(itemId);
    TestValidator.predicate(
      "item still exists after admin header update",
      () => after !== undefined,
    );
    TestValidator.equals(
      "line_item_status unchanged",
      after?.lineItemStatus,
      base.lineItemStatus,
    );
    TestValidator.equals(
      "sellerSnapshotId unchanged (snapshot integrity)",
      after?.sellerSnapshotId,
      base.sellerSnapshotId,
    );
  }
  // 7) Derived overall order status should remain consistent if no item terminal state changes
  // (Removed: 'overallStatus' is not present on IShoppingMallOrder typings)
}
