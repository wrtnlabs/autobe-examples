import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_admin_orders_oversight_apply_order_oversight } from "../../../generate/generate_random_shopping_mall_admin_orders_oversight_apply_order_oversight";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_oversight_force_cancel_retry_snapshot_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authorize as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds: IShoppingMallAdmin.ILogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  };
  const adminJoin: IShoppingMallAdmin.IJoin = {
    email: adminCreds.email,
    password: adminCreds.password,
  };
  await authorize_admin_login(adminConnection, {
    body: adminJoin satisfies IShoppingMallAdmin.ILogin,
  });
  // 2) Create a member order with at least one order item
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCred = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberCred.email,
      password: memberCred.password,
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberAuth = await authorize_member_login(memberConnection, {
    body: {
      email: memberCred.email,
      password: memberCred.password,
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(memberAuth);
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  TestValidator.predicate(
    "order has order items",
    () => order.orderItems.length > 0,
  );
  const orderItem = order.orderItems[0]!;
  typia.assert(orderItem);
  // 3) Force-cancel oversight twice with identical payload
  // The oversight endpoint accepts IShoppingMallOrder.ICreate as body;
  // we will pass stable identifiers from the created order/item.
  const oversightBody: IShoppingMallOrder.ICreate = {
    shopping_mall_payment_id: order.payment.id,
    ship_to_name: order.ship_to_name,
    ship_to_phone: order.ship_to_phone,
    ship_to_postal_code: order.ship_to_postal_code,
    ship_to_region: order.ship_to_region,
    ship_to_city: order.ship_to_city,
    ship_to_street_address: order.ship_to_street_address,
    ship_to_detail_address: order.ship_to_detail_address,
    shipping_instructions: order.shipping_instructions,
  };
  // First application
  await api.functional.shoppingMall.admin.orders.oversight.applyOrderOversight(
    adminConnection,
    {
      body: oversightBody,
    },
  );
  // Retry (same parameters)
  await api.functional.shoppingMall.admin.orders.oversight.applyOrderOversight(
    adminConnection,
    {
      body: oversightBody,
    },
  );
}
