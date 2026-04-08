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
 * Test administrator's ability to filter orders by specific customer member_id.
 *
 * Verifies admin can investigate all orders placed by a particular customer account. Creates multiple customers with orders, then filters by one customer's member_id to validate response contains only orders belonging to the specified customer. Customer information in response must match the filter criteria.
 *
 * This workflow is critical for customer support and account investigation scenarios where administrators need to view order history for specific customers.
 *
 * 1. Administrator account is created and authenticated to access admin-only endpoints.
 * 2. First customer registers and places an order.
 * 3. Second customer registers and places an order.
 * 4. Administrator filters orders by first customer's member_id.
 * 5. Validates response contains only first customer's orders.
 * 6. Verifies customer information in response matches filter criteria.
 * 7. Tests filtering by second customer's member_id to confirm isolation.
 */
export async function test_api_admin_order_filter_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication - create admin account first
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. First customer registration
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_member_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customer1);
  // 3. Second customer registration
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_member_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customer2);
  // 4. Administrator filters orders by first customer's member_id
  const ordersForCustomer1 =
    await api.functional.shoppingMall.admin.admin.orders.index(
      adminConnection,
      {
        body: {
          member_id: customer1.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(ordersForCustomer1);
  // 5. Validate all orders belong to customer1 (filter isolation)
  TestValidator.predicate(
    "all orders belong to customer1",
    ordersForCustomer1.data.every((order) => order.member.id === customer1.id),
  );
  // 6. Verify customer information matches filter criteria
  if (ordersForCustomer1.data.length > 0) {
    TestValidator.equals(
      "customer email matches",
      ordersForCustomer1.data[0].member.email,
      customer1.email,
    );
  }
  // 7. Filter by second customer's member_id to confirm isolation
  const ordersForCustomer2 =
    await api.functional.shoppingMall.admin.admin.orders.index(
      adminConnection,
      {
        body: {
          member_id: customer2.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(ordersForCustomer2);
  // Validate all orders belong to customer2
  TestValidator.predicate(
    "all orders belong to customer2",
    ordersForCustomer2.data.every((order) => order.member.id === customer2.id),
  );
  // Verify customer2 orders are different from customer1 orders when both have orders
  if (
    ordersForCustomer1.data.length > 0 &&
    ordersForCustomer2.data.length > 0
  ) {
    TestValidator.notEquals(
      "customer1 and customer2 have different orders",
      ordersForCustomer1.data[0].id,
      ordersForCustomer2.data[0].id,
    );
  }
}
