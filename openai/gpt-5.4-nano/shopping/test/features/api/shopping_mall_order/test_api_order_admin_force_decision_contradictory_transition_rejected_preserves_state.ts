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

export async function test_api_order_admin_force_decision_contradictory_transition_rejected_preserves_state(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberConnection.headers
        ? (undefined as unknown as string & tags.Format<"email">)
        : typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  const payment = await generate_random_shopping_mall_member_payments_create(
    memberConnection,
    {},
  );
  typia.assert(payment);
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_payment_id: payment.id,
        ship_to_name: typia.random<string>(),
        ship_to_phone: typia.random<string>(),
        ship_to_postal_code: typia.random<string>(),
        ship_to_region: typia.random<string>(),
        ship_to_city: typia.random<string>(),
        ship_to_street_address: typia.random<string>(),
        ship_to_detail_address: typia.random<string>(),
        shipping_instructions: undefined,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  typia.assert(order.orderItems.length >= 1);

  const orderId = order.id;
  const snapshotBefore = order.orderItems.map((it) => it.seller_snapshot_id);
  const lineItemStatusBefore = order.orderItems.map(
    (it) => it.line_item_status,
  );

  type WithOverall = IShoppingMallOrder & {
    overallStatus?: unknown;
    overall_status?: unknown;
  };
  const overallStatusBefore = (order as WithOverall).overallStatus ?? (order as WithOverall).overall_status;

  await api.functional.shoppingMall.admin.admin.orders.update(adminConnection, {
    orderId,
    body: {
      ship_to_name: undefined,
      ship_to_phone: undefined,
      ship_to_postal_code: undefined,
      ship_to_region: undefined,
      ship_to_city: undefined,
      ship_to_street_address: undefined,
      ship_to_detail_address: undefined,
      shipping_instructions: undefined,
    } satisfies IShoppingMallOrder.IUpdate,
  });

  const afterFirst = await api.functional.shoppingMall.admin.admin.orders.update(
    adminConnection,
    {
      orderId,
      body: {
        ship_to_name: undefined,
      } satisfies IShoppingMallOrder.IUpdate,
    },
  );
  typia.assert(afterFirst);

  const lineItemStatusAfterFirst = afterFirst.orderItems.map(
    (it) => it.line_item_status,
  );
  const overallStatusAfterFirst =
    (afterFirst as WithOverall).overallStatus ??
    (afterFirst as WithOverall).overall_status;
  const snapshotAfterFirst = afterFirst.orderItems.map(
    (it) => it.seller_snapshot_id,
  );

  await TestValidator.error(
    "contradictory admin transition rejected",
    async () => {
      await api.functional.shoppingMall.admin.admin.orders.update(
        adminConnection,
        {
          orderId,
          body: {
            ship_to_name: undefined,
            shipping_instructions: null,
          } satisfies IShoppingMallOrder.IUpdate,
        },
      );
    },
  );

  const afterSecond = await api.functional.shoppingMall.admin.admin.orders.update(
    adminConnection,
    {
      orderId,
      body: {} satisfies IShoppingMallOrder.IUpdate,
    },
  );
  typia.assert(afterSecond);

  TestValidator.equals(
    "line_item_status preserved",
    afterSecond.orderItems.map((it) => it.line_item_status),
    lineItemStatusAfterFirst,
  );
  TestValidator.equals(
    "overall_status preserved",
    (afterSecond as WithOverall).overallStatus ??
      (afterSecond as WithOverall).overall_status,
    overallStatusAfterFirst,
  );
  TestValidator.equals(
    "seller_snapshot_id preserved",
    afterSecond.orderItems.map((it) => it.seller_snapshot_id),
    snapshotAfterFirst,
  );
  TestValidator.equals(
    "no conflicting snapshot change vs before",
    snapshotAfterFirst,
    snapshotBefore,
  );
}
