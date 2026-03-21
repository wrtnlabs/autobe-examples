import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin retrieving order items with status filter.
 * 1. Admin authenticates via admin join endpoint
 * 2. Admin queries order items filtering by status='delivered'
 * 3. Validate response contains paginated list of delivered order items
 * 4. Validate pagination metadata
 * 5. Validate required fields in order item summaries
 */
export async function test_api_admin_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Query order items filtering by status='delivered'
  const orderItemsPage =
    await api.functional.ecommerceMall.admin.order_items.index(
      adminConnection,
      {
        body: {
          status: ["delivered"],
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsPage);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    orderItemsPage.pagination !== null,
    true,
  );
  TestValidator.equals(
    "current page is valid",
    orderItemsPage.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "limit is valid",
    orderItemsPage.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "records count is valid",
    orderItemsPage.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages count is valid",
    orderItemsPage.pagination.pages >= 0,
    true,
  );
  // 4. Validate all items have 'delivered' status when filter is applied
  for (const item of orderItemsPage.data) {
    TestValidator.equals(
      "order item has delivered status",
      item.status,
      "delivered",
    );
  }
  // 5. Validate required fields in each order item summary
  for (const item of orderItemsPage.data) {
    // Validate id
    TestValidator.equals("has valid id", item.id.length > 0, true);
    // Validate quantity
    TestValidator.predicate("quantity is positive", item.quantity > 0);
    // Validate unit_price
    TestValidator.predicate("unit_price is non-negative", item.unit_price >= 0);
    // Validate status
    TestValidator.equals("status is delivered", item.status, "delivered");
    // Validate created_at
    TestValidator.equals(
      "has valid created_at",
      item.created_at !== null,
      true,
    );
    // Validate subtotal calculation
    TestValidator.equals(
      "subtotal equals quantity * unit_price",
      item.subtotal,
      item.quantity * item.unit_price,
    );
    // Validate order reference
    TestValidator.equals("has order reference", item.order !== null, true);
    TestValidator.equals("has valid order id", item.order.id.length > 0, true);
    // Validate productSnapshot (frozen product state)
    TestValidator.equals(
      "has productSnapshot",
      item.productSnapshot !== null,
      true,
    );
    TestValidator.equals(
      "productSnapshot has valid id",
      item.productSnapshot.id.length > 0,
      true,
    );
    TestValidator.equals(
      "productSnapshot has name",
      item.productSnapshot.name.length > 0,
      true,
    );
    TestValidator.equals(
      "productSnapshot has description",
      item.productSnapshot.description !== null,
      true,
    );
    TestValidator.equals(
      "productSnapshot has base_price",
      item.productSnapshot.base_price >= 0,
      true,
    );
    TestValidator.equals(
      "productSnapshot has category_name",
      item.productSnapshot.category_name.length > 0,
      true,
    );
    TestValidator.equals(
      "productSnapshot has seller",
      item.productSnapshot.seller !== null,
      true,
    );
    // Validate sellerProfileSnapshot (frozen seller state)
    TestValidator.equals(
      "has sellerProfileSnapshot",
      item.sellerProfileSnapshot !== null,
      true,
    );
    TestValidator.equals(
      "sellerProfileSnapshot has valid id",
      item.sellerProfileSnapshot.id.length > 0,
      true,
    );
    TestValidator.equals(
      "sellerProfileSnapshot has shop_name",
      item.sellerProfileSnapshot.shop_name.length > 0,
      true,
    );
    TestValidator.equals(
      "sellerProfileSnapshot has created_at",
      item.sellerProfileSnapshot.created_at !== null,
      true,
    );
  }
}
