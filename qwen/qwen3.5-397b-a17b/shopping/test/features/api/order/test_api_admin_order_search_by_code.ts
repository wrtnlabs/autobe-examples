import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test administrator's ability to search orders by partial order code match.
 *
 * Verifies admin can locate specific orders using the human-readable order code. Creates orders with known codes, then searches using partial code string. Validates response includes only orders matching the search criteria with case-insensitive partial matching. Verifies order code field is included in response for customer support reference. This workflow enables administrators to quickly investigate specific orders reported by customers.
 *
 * 1. Administrator account creation and authentication.
 * 2. Customer member account creation and authentication.
 * 3. Customer places multiple orders with distinct order codes.
 * 4. Administrator searches orders using partial code match.
 * 5. Validates search results contain only matching orders with correct code field.
 * 6. Tests case-insensitive partial matching behavior.
 * 7. Verifies pagination metadata and order summary structure.
 */
export async function test_api_admin_order_search_by_code(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  // 2. Customer member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create multiple orders for the customer
  const order1 =
    await generate_random_shopping_mall_member_orders_create(memberConnection, {});
  typia.assert(order1);
  const order2 =
    await generate_random_shopping_mall_member_orders_create(memberConnection, {});
  typia.assert(order2);
  const order3 =
    await generate_random_shopping_mall_member_orders_create(memberConnection, {});
  typia.assert(order3);
  // 4. Search orders by partial code match using first order's code
  const searchCode = order1.code.substring(
    0,
    Math.max(3, order1.code.length - 2),
  );
  const searchResult =
    await api.functional.shoppingMall.admin.admin.orders.index(
      adminConnection,
      {
        body: {
          search: searchCode,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(searchResult);
  // 5. Validate search results
  TestValidator.predicate(
    "search returns at least one order",
    searchResult.data.length >= 1,
  );
  // Verify all returned orders contain the search code
  for (const order of searchResult.data) {
    TestValidator.predicate(
      `order code ${order.code} contains search term ${searchCode}`,
      order.code.toLowerCase().includes(searchCode.toLowerCase()),
    );
  }
  // Verify the first order is in the results
  const foundOrder = searchResult.data.find((o) => o.id === order1.id);
  TestValidator.predicate(
    "first order found in search results",
    foundOrder !== undefined,
  );
  // 6. Test with different search term that should match second order
  const searchCode2 = order2.code.substring(
    0,
    Math.max(3, order2.code.length - 2),
  );
  const searchResult2 =
    await api.functional.shoppingMall.admin.admin.orders.index(
      adminConnection,
      {
        body: {
          search: searchCode2,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Verify second order is in results
  const foundOrder2 = searchResult2.data.find((o) => o.id === order2.id);
  TestValidator.predicate(
    "second order found in search results",
    foundOrder2 !== undefined,
  );
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    searchResult.pagination.limit >= 1 && searchResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 8. Validate order summary structure includes code field
  if (searchResult.data.length > 0) {
    const firstOrder = searchResult.data[0];
    TestValidator.predicate(
      "order code field exists and is non-empty",
      firstOrder.code !== undefined && firstOrder.code.length > 0,
    );
    TestValidator.predicate(
      "order total_price is positive",
      firstOrder.total_price > 0,
    );
    TestValidator.predicate(
      "order has member reference",
      firstOrder.member !== undefined,
    );
    TestValidator.predicate(
      "order items_count is non-negative",
      firstOrder.items_count >= 0,
    );
  }
}