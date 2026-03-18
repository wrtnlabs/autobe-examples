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

export async function test_api_order_oversight_force_cancel_single_item(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });

  const orderCreatePayload = prepare_random_shopping_mall_order();
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    { body: orderCreatePayload },
  );
  typia.assert(order);

  const forceCancelPayload = {
    shopping_mall_payment_id: typia.random<string & tags.Format<"uuid">>(),
    ship_to_name: RandomGenerator.name(),
    ship_to_phone: RandomGenerator.mobile(),
    ship_to_postal_code: RandomGenerator.alphabets(6),
    ship_to_region: RandomGenerator.alphabets(10),
    ship_to_city: RandomGenerator.alphabets(10),
    ship_to_street_address: RandomGenerator.alphabets(20),
    ship_to_detail_address: RandomGenerator.alphabets(20),
    shipping_instructions: null,
  } satisfies IShoppingMallOrder.ICreate;

  await generate_random_shopping_mall_admin_orders_oversight_apply_order_oversight(
    adminConnection,
    { body: forceCancelPayload },
  );

  await generate_random_shopping_mall_admin_orders_oversight_apply_order_oversight(
    adminConnection,
    { body: forceCancelPayload },
  );
}
