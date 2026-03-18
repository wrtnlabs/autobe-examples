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

export async function test_api_order_item_deletion_forbidden_not_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    },
  });
  // 2) Member A creates an order and an order item it owns
  const createdOrderA =
    await generate_random_shopping_mall_member_orders_create(
      memberAConnection,
      {},
    );
  typia.assert(createdOrderA);
  const createdOrderItemA =
    await generate_random_shopping_mall_member_order_items_create(
      memberAConnection,
      {
        body: {
          shopping_mall_order_id: createdOrderA.id,
        },
      },
    );
  typia.assert(createdOrderItemA);
  const orderItemId = createdOrderItemA.id;
  // 4) Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    },
  });
  // 5-6) Forbidden delete attempt (must be denied: 403 or secure 404)
  await TestValidator.httpError(
    "member B cannot delete member A order item",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.member.order_items.erase(
        memberBConnection,
        {
          orderItemId,
        },
      );
    },
  );
  // 7) Verify still readable by Member A
  const fetchedAfter = await api.functional.shoppingMall.member.order_items.at(
    memberAConnection,
    {
      orderItemId,
    },
  );
  typia.assert(fetchedAfter);
  TestValidator.equals(
    "orderItemId still matches",
    fetchedAfter.id,
    orderItemId,
  );
  TestValidator.equals(
    "shopping mall order id unchanged",
    fetchedAfter.shoppingMallOrderId,
    createdOrderItemA.shoppingMallOrderId,
  );
}
