import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
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

export async function test_api_member_order_history_excludes_soft_deleted_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new member via join
  const memberJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const password = "Passw0rd!";
  const email =
    `member_${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}@example.com` satisfies string &
      tags.Format<"email">;
  const joined = await authorize_member_join(memberJoinConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(joined);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = memberJoinConnection.headers;
  // 2) Create at least two successful orders
  const [firstOrder, secondOrder] = await Promise.all([
    generate_random_shopping_mall_member_orders_create(memberConnection, {
      body: undefined,
    }),
    generate_random_shopping_mall_member_orders_create(memberConnection, {
      body: undefined,
    }),
  ]);
  typia.assert(firstOrder);
  typia.assert(secondOrder);
  // Decide which one is older (placed_at) to soft-delete
  const olderOrder =
    new Date(firstOrder.placed_at).getTime() <=
    new Date(secondOrder.placed_at).getTime()
      ? firstOrder
      : secondOrder;
  const newerOrder = olderOrder.id === firstOrder.id ? secondOrder : firstOrder;
  const limit = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  // Capture expected summaries before soft-deletion
  const beforeHistory =
    await api.functional.shoppingMall.member.orders.history.index(
      memberConnection,
      {
        body: {
          page,
          limit,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(beforeHistory);
  const beforeById = new Map(beforeHistory.data.map((s) => [s.id, s] as const));
  const expectedNewerSummary = beforeById.get(newerOrder.id);
  const expectedOlderSummary = beforeById.get(olderOrder.id);
  TestValidator.predicate(
    "beforeHistory should include newer order summary",
    expectedNewerSummary !== undefined,
  );
  TestValidator.predicate(
    "beforeHistory should include older order summary",
    expectedOlderSummary !== undefined,
  );
  // 3) Soft-delete the older order
  await api.functional.shoppingMall.member.orders.erase(memberConnection, {
    orderId: olderOrder.id,
  });
  // 4) Call order history again
  const historyPage =
    await api.functional.shoppingMall.member.orders.history.index(
      memberConnection,
      {
        body: {
          page,
          limit,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(historyPage);
  // 5) Validate exclusion + ordering + derived fields
  TestValidator.equals(
    "pagination records should exclude soft-deleted order",
    historyPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "returned data should contain only active non-deleted order(s)",
    historyPage.data.length,
    1,
  );
  const returnedOrder = historyPage.data[0]!;
  typia.assert(returnedOrder);
  TestValidator.equals("returned id", returnedOrder.id, newerOrder.id);
  TestValidator.equals(
    "returned orderCode",
    returnedOrder.orderCode,
    newerOrder.order_code,
  );
  TestValidator.equals(
    "returned placedAt",
    returnedOrder.placedAt,
    newerOrder.placed_at,
  );
  const expectedTotalPrice = newerOrder.orderItems.reduce(
    (sum, item) => sum + item.seller_price_at_purchase * item.quantity,
    0,
  );
  TestValidator.equals(
    "returned totalPrice",
    returnedOrder.totalPrice,
    expectedTotalPrice,
  );
  TestValidator.equals(
    "overallStatus should remain consistent after soft-deletion of other order",
    returnedOrder.overallStatus,
    expectedNewerSummary!.overallStatus,
  );
  TestValidator.notEquals(
    "soft-deleted order must be excluded",
    returnedOrder.id,
    olderOrder.id,
  );
}
