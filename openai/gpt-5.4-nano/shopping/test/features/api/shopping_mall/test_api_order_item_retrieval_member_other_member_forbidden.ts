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
import { generate_random_shopping_mall_member_order_items_create } from "../../../generate/generate_random_shopping_mall_member_order_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";

export async function test_api_order_item_retrieval_member_other_member_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberA);

  const memberAOrder = await generate_random_shopping_mall_member_orders_create(
    memberAConnection,
    {
      body: {
        ...prepare_random_shopping_mall_order(),
        shopping_mall_payment_id: memberA.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(memberAOrder);

  const memberAOrderItem = await generate_random_shopping_mall_member_order_items_create(
    memberAConnection,
    {
      body: {
        ...prepare_random_shopping_mall_order_item(),
        shopping_mall_order_id: memberAOrder.id,
      } satisfies IShoppingMallOrderItem.ICreate,
    },
  );
  typia.assert(memberAOrderItem);

  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });

  await TestValidator.error(
    "member cannot retrieve another member's order item (must be authorization error or not-found)",
    async () => {
      const output = await api.functional.shoppingMall.member.order_items.at(
        memberBConnection,
        {
          orderItemId: memberAOrderItem.id,
        },
      );
      typia.assert(output);

      TestValidator.notEquals(
        "orderItem id must not be returned to other member",
        output.id,
        memberAOrderItem.id,
      );

      TestValidator.notEquals(
        "parent order id must not be returned to other member",
        output.shoppingMallOrderId,
        memberAOrderItem.shoppingMallOrderId,
      );
    },
  );
}
