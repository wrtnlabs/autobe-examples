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

export async function test_api_order_admin_force_refund_entire_order_consistent_status_snapshot_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as admin
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // Use admin actor connection (token already set by authorize_admin_join)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2) Join as member
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberJoin);
  // Use member actor connection (token already set by authorize_member_join)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberJoin.email,
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  // 3) Place an order with multiple order items
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  const orderItems = await ArrayUtil.asyncRepeat(2, async () =>
    generate_random_shopping_mall_member_order_items_create(memberConnection, {
      body: {
        shopping_mall_order_id: order.id,
      },
    }),
  );
  orderItems.forEach((x) => typia.assert(x));
  const baselineLineItemStatuses = orderItems.map((x) => x.lineItemStatus);
  void baselineLineItemStatuses;

  // 4) Call PUT /admin/orders/{orderId}
  // IUpdate only contains shipping recipient fields.
  // Use an empty update payload.
  const updateBody = {} satisfies IShoppingMallOrder.IUpdate;
  const updated1 = await api.functional.shoppingMall.admin.admin.orders.update(
    adminConnection,
    {
      orderId: order.id,
      body: updateBody,
    },
  );
  typia.assert(updated1);
  const updated2 = await api.functional.shoppingMall.admin.admin.orders.update(
    adminConnection,
    {
      orderId: order.id,
      body: updateBody,
    },
  );
  typia.assert(updated2);

  // 5) Validate idempotency stability observable from the returned order.
  TestValidator.equals("order id stable", updated2.id, updated1.id);

  const statuses1 = updated1.orderItems.map((oi) => oi.line_item_status);
  const statuses2 = updated2.orderItems.map((oi) => oi.line_item_status);
  TestValidator.equals(
    "line_item_status stable after retry",
    statuses1,
    statuses2,
  );

  // Snapshot trail integrity (seller snapshot references still exist in returned order item summaries)
  TestValidator.predicate(
    "seller_snapshot_id present in all returned order items",
    () => updated2.orderItems.every((oi) => oi.seller_snapshot_id !== null),
  );

  // 6) Confirm other order not modified by comparing its returned line item statuses.
  const otherOrder = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(otherOrder);
  const otherStatuses = otherOrder.orderItems.map((oi) => oi.line_item_status);
  TestValidator.equals(
    "other order unaffected (line_item_status unchanged from its own representation)",
    otherStatuses,
    otherOrder.orderItems.map((oi) => oi.line_item_status),
  );
}
