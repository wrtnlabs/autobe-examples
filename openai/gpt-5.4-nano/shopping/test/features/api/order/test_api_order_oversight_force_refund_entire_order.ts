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

export async function test_api_order_oversight_force_refund_entire_order(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: This system template provides no utility imports or SDK calls for
  // observing item-level statuses/inventory/snapshots after oversight.
  // Therefore, this test focuses on executing the full actor + setup + command
  // flow with type/runtime validation.
  // 1) Admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 2) Member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IShoppingMallMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberJoinBody,
  });
  typia.assert(memberAuth);
  // 3) Create order via generation helper.
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 4) Force-refund entire order via oversight endpoint.
  const adminOversightBody = {
    // Use order-scope: the SDK expects IShoppingMallOrder.ICreate; the
    // service uses these fields to resolve the target order and items.
    shopping_mall_payment_id: order.payment.id,
    ship_to_name: order.ship_to_name,
    ship_to_phone: order.ship_to_phone,
    ship_to_postal_code: order.ship_to_postal_code,
    ship_to_region: order.ship_to_region,
    ship_to_city: order.ship_to_city,
    ship_to_street_address: order.ship_to_street_address,
    ship_to_detail_address: order.ship_to_detail_address,
    shipping_instructions: order.shipping_instructions,
  } satisfies IShoppingMallOrder.ICreate;
  await generate_random_shopping_mall_admin_orders_oversight_apply_order_oversight(
    adminConnection,
    {
      body: adminOversightBody,
    },
  );
  // No further retrieval endpoints are available in the provided SDK/DTO set.
}
