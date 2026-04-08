import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

/**
 * Test member order history pagination with multiple orders.
 *
 * Validates the complete order history retrieval flow including member authentication, multiple order creation, and paginated order list retrieval. Ensures that orders are returned sorted by created_at descending (newest first), pagination metadata is accurate, and only the authenticated member's orders are returned.
 *
 * 1. Member registers with unique email and credentials.
 * 2. Member creates first order through checkout flow.
 * 3. Member creates second order through checkout flow.
 * 4. Member retrieves order history with pagination.
 * 5. Validates order count, sorting, pagination metadata, and data isolation.
 */
export async function test_api_order_history_pagination_with_multiple_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Create first order
  const firstOrder = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(firstOrder);
  // Wait a small delay to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 3. Create second order
  const secondOrder = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(secondOrder);
  // 4. Retrieve order history with pagination
  const orderHistory = await api.functional.shoppingMall.member.orders.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        direction: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderHistory);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "total records count",
    orderHistory.pagination.records,
    2,
  );
  TestValidator.equals("current page", orderHistory.pagination.current, 1);
  TestValidator.equals("page limit", orderHistory.pagination.limit, 10);
  TestValidator.equals("total pages", orderHistory.pagination.pages, 1);
  // 6. Validate order count
  TestValidator.equals("order list length", orderHistory.data.length, 2);
  // 7. Validate sorting (newest first - second order should be first)
  TestValidator.equals(
    "first order is newest",
    orderHistory.data[0].id,
    secondOrder.id,
  );
  TestValidator.equals(
    "second order is oldest",
    orderHistory.data[1].id,
    firstOrder.id,
  );
  // 8. Validate order codes match created orders
  const orderCodes = orderHistory.data.map((o) => o.code);
  TestValidator.predicate(
    "contains first order code",
    orderCodes.includes(firstOrder.code),
  );
  TestValidator.predicate(
    "contains second order code",
    orderCodes.includes(secondOrder.code),
  );
  // 9. Validate business logic for each order
  for (const order of orderHistory.data) {
    // Validate items_count is positive (business rule)
    TestValidator.predicate("items_count is positive", order.items_count > 0);
    // Validate total_price is positive (business rule)
    TestValidator.predicate("total_price is positive", order.total_price > 0);
    // Validate member belongs to authenticated user
    TestValidator.equals(
      "member id matches authenticated member",
      order.member.id,
      member.id,
    );
  }
}
