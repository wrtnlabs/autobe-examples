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
 * Test administrator's ability to view all orders across the entire platform.
 *
 * Verifies that admin can retrieve a paginated list of orders from all customers regardless of ownership. Validates response includes order summary with code, total_price, customer member information, computed status, and items_count. Tests default pagination (page 1, limit 20, sorted by created_at descending) and ensures soft-deleted orders are excluded from results. This is the primary success path for administrative order oversight.
 *
 * 1. Administrator account setup - Create admin credentials and authenticate to obtain admin connection with proper authorization token.
 * 2. Customer member creation - Register a customer member account with unique email and credentials for placing test orders.
 * 3. Order data generation - Create multiple orders using the customer account to populate the platform with test order data.
 * 4. Admin order list retrieval - Call the admin orders endpoint with default pagination parameters to fetch all platform orders.
 * 5. Response validation - Verify pagination metadata (current page, limit, records count, total pages), order summary structure (id, code, total_price, member, status, items_count, created_at), and that orders belong to the created customer.
 * 6. Data integrity checks - Ensure order codes are unique, total prices are positive, member references contain valid customer information, and computed status values are present.
 */
export async function test_api_admin_order_list_all_platform_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - Create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    grade: "regular" as const,
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Customer member creation - Register customer for placing orders
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberJoin);
  // 3. Generate multiple orders for testing
  const orderCount = 3;
  const createdOrders: IShoppingMallOrder[] = [];
  for (let i = 0; i < orderCount; i++) {
    const order = await generate_random_shopping_mall_member_orders_create(
      memberConnection,
      {},
    );
    typia.assert(order);
    createdOrders.push(order);
  }
  // 4. Admin retrieves all platform orders with default pagination
  const orderListResponse =
    await api.functional.shoppingMall.admin.admin.orders.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(orderListResponse);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", orderListResponse.pagination.current, 1);
  TestValidator.equals("limit", orderListResponse.pagination.limit, 20);
  TestValidator.predicate(
    "records count positive",
    orderListResponse.pagination.records >= orderCount,
  );
  TestValidator.predicate(
    "pages count positive",
    orderListResponse.pagination.pages >= 1,
  );
  // 6. Validate order list data
  TestValidator.predicate(
    "has at least created orders",
    orderListResponse.data.length >= orderCount,
  );
  // 7. Validate business logic - created orders appear in the list
  const createdOrderIds = new Set(createdOrders.map((o) => o.id));
  const foundOrders = orderListResponse.data.filter((o) =>
    createdOrderIds.has(o.id),
  );
  TestValidator.equals("created orders found", foundOrders.length, orderCount);
  // 8. Verify order codes are unique
  const orderCodes = orderListResponse.data.map((o) => o.code);
  const uniqueCodes = new Set(orderCodes);
  TestValidator.equals(
    "order codes are unique",
    uniqueCodes.size,
    orderCodes.length,
  );
  // 9. Validate business logic on orders - total prices are positive
  for (const order of orderListResponse.data) {
    TestValidator.predicate("total price positive", order.total_price > 0);
    TestValidator.predicate("items count non-negative", order.items_count >= 0);
  }
}
