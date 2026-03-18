import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_header_update_forbidden_when_not_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A join/authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberA);
  // 2) Member A creates an order owned by member A
  const orderA = await generate_random_shopping_mall_member_orders_create(
    memberAConnection,
    {},
  );
  typia.assert(orderA);
  const beforeShipToName: string = orderA.ship_to_name;
  const beforeShippingInstructions: string | null =
    orderA.shipping_instructions;
  // 3) Member B join/authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberB);
  // 4) As member B, attempt forbidden update of Member A's order header
  const updatedShipToName = `${RandomGenerator.name()}`;
  const updatedShippingInstructions: string | null = RandomGenerator.paragraph({
    sentences: 2,
  });
  await TestValidator.error(
    "forbidden header update when not order owner",
    async () => {
      await api.functional.shoppingMall.member.orders.update(
        memberBConnection,
        {
          orderId: orderA.id,
          body: {
            ship_to_name: updatedShipToName,
            shipping_instructions: updatedShippingInstructions,
          } satisfies IShoppingMallOrder.IUpdate,
        },
      );
    },
  );
  // 6) Refetch as member A and ensure non-mutation
  const orderAfter = await api.functional.shoppingMall.member.orders.at(
    memberAConnection,
    { orderId: orderA.id },
  );
  typia.assert(orderAfter);
  TestValidator.equals(
    "ship_to_name unchanged",
    orderAfter.ship_to_name,
    beforeShipToName,
  );
  TestValidator.equals(
    "shipping_instructions unchanged",
    orderAfter.shipping_instructions,
    beforeShippingInstructions,
  );
}
