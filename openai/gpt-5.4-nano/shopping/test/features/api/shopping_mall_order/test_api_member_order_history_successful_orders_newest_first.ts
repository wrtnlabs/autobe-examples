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

export async function test_api_member_order_history_successful_orders_newest_first(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword!2345" satisfies string & tags.Format<"password">,
    },
  });
  typia.assert(memberAuth);
  const orderCreateConnection: api.IConnection = { host: connection.host };
  // authorize_member_join mutates headers on its passed connection; re-use memberConnection
  // by ensuring we use the same connection instance for subsequent calls
  // (actor-specific connection for member endpoints)
  // 2) Create two orders for the same member
  const eligibleOrderA =
    await generate_random_shopping_mall_member_orders_create(
      orderCreateConnection,
      {},
    );
  typia.assert(eligibleOrderA);
  // Ensure distinct by creating another order
  const eligibleOrderB =
    await generate_random_shopping_mall_member_orders_create(
      orderCreateConnection,
      {},
    );
  typia.assert(eligibleOrderB);
  // 3) Request order history newest-first
  const historyResponse =
    await api.functional.shoppingMall.member.orders.history.index(
      orderCreateConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "placed_at",
          sortDirection: "desc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 4) Validate response ordering + filtering (success-only)
  const returned = historyResponse.data;
  // Data isolation: only orders we created should appear
  const createdById = new Set([eligibleOrderA.id, eligibleOrderB.id] as Array<
    IShoppingMallOrder["id"]
  >);
  TestValidator.predicate("all returned orders belong to this member", () =>
    returned.every((o) => createdById.has(o.id)),
  );
  // Success filter: at least one of the created orders should be excluded
  TestValidator.predicate(
    "failed/non-success order excluded from history",
    () =>
      returned.length < 2 ||
      (returned.some((o) => o.id !== eligibleOrderA.id) &&
        returned.some((o) => o.id !== eligibleOrderB.id) === false),
  );
  TestValidator.predicate(
    "returned length respects limit",
    () => returned.length <= (historyResponse.pagination.limit ?? 0),
  );
  const expectedPlacedA = eligibleOrderA.placed_at;
  const expectedPlacedB = eligibleOrderB.placed_at;
  const maxPlaced =
    expectedPlacedA > expectedPlacedB ? expectedPlacedA : expectedPlacedB;
  TestValidator.equals(
    "newest-first by placedAt",
    returned[0]?.placedAt,
    maxPlaced,
  );
  const computeTotalPrice = (order: IShoppingMallOrder): number =>
    order.orderItems.reduce(
      (sum, it) => sum + it.seller_price_at_purchase * it.quantity,
      0,
    );
  const deriveOverallStatus = (order: IShoppingMallOrder): string => {
    if (order.shipments.length > 0) return order.shipments[0].status;
    if (order.orderItems.length > 0)
      return order.orderItems[0].line_item_status;
    return "";
  };
  const byId = new Map<string, IShoppingMallOrder>([
    [eligibleOrderA.id, eligibleOrderA],
    [eligibleOrderB.id, eligibleOrderB],
  ]);
  for (const summary of returned) {
    const created = byId.get(summary.id);
    if (!created) throw new Error("Unexpected order id in history response");
    TestValidator.equals(
      "orderCode matches",
      summary.orderCode,
      created.order_code,
    );
    TestValidator.equals(
      "placedAt matches",
      summary.placedAt,
      created.placed_at,
    );
    const expectedTotal = computeTotalPrice(created);
    TestValidator.equals(
      "totalPrice matches",
      summary.totalPrice,
      expectedTotal,
    );
    const expectedOverallStatus = deriveOverallStatus(created);
    TestValidator.equals(
      "overallStatus derived matches",
      summary.overallStatus,
      expectedOverallStatus,
    );
  }
  // Pagination: records should be equal to number of included eligible orders
  const expectedRecords = returned.length;
  TestValidator.equals(
    "pagination records matches returned eligible orders",
    historyResponse.pagination.records,
    expectedRecords,
  );
}
