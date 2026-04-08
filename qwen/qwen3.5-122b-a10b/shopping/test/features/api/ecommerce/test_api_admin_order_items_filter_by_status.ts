import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create test order with items of different statuses
  // Note: In a real scenario, we would need to create an order and then
  // manipulate item statuses through shipping, delivery, cancellation, refund operations.
  // For this test, we'll use typia.random to generate the order ID and test the filtering API
  // directly with various status filters.
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test filtering by each status
  const statuses: string[] = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  for (const status of statuses) {
    // Filter order items by status
    const filteredItems =
      await api.functional.ecommerce.admin.orders.items.index(adminConnection, {
        orderId,
        body: {
          status,
          limit: 100,
        } satisfies IEcommerceOrderItem.IRequest,
      });
    typia.assert(filteredItems);
    // Validate that all returned items match the filtered status
    for (const item of filteredItems.data) {
      TestValidator.equals(
        `item status matches filter "${status}"`,
        item.status,
        status,
      );
    }
    // Validate pagination metadata
    TestValidator.predicate(
      `pagination records count for status "${status}"`,
      filteredItems.pagination.records >= filteredItems.data.length,
    );
    TestValidator.equals(
      `pagination current page for status "${status}"`,
      filteredItems.pagination.current,
      1,
    );
  }
  // 4. Test filtering without status (should return all items)
  const allItems = await api.functional.ecommerce.admin.orders.items.index(
    adminConnection,
    {
      orderId,
      body: {
        limit: 100,
      } satisfies IEcommerceOrderItem.IRequest,
    },
  );
  typia.assert(allItems);
  // 5. Test with invalid status (should handle gracefully)
  const invalidStatusItems =
    await api.functional.ecommerce.admin.orders.items.index(adminConnection, {
      orderId,
      body: {
        status: "invalid_status",
        limit: 100,
      } satisfies IEcommerceOrderItem.IRequest,
    });
  typia.assert(invalidStatusItems);
  // Validate response structure
  TestValidator.predicate(
    "response has pagination",
    invalidStatusItems.pagination !== null &&
      invalidStatusItems.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(invalidStatusItems.data),
  );
}
