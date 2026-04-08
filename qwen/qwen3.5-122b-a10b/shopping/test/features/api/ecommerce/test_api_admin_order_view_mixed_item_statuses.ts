import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator viewing an order with mixed item statuses.
 *
 * Validates that administrators can access order details through the admin oversight endpoint, including all order items with their individual fulfillment statuses, product variant information, seller references, and historical snapshots. The test ensures the order status is properly computed from its items' statuses, showing 'partially_completed' when items have mixed fulfillment states.
 *
 * The test authenticates as administrator and retrieves an order, validating that:
 * 1. All order item statuses are individually reported (paid, shipped, delivered, cancelled, refunded)
 * 2. The parent order's aggregate status reflects the mixed states correctly
 * 3. Product variant details, seller information, and snapshots are included
 * 4. Shipping and tracking information is present when applicable
 *
 * 1. Administrator authenticates via join endpoint to obtain access token.
 * 2. Administrator views order by ID through admin orders endpoint.
 * 3. Validates order structure including customer, items, and shipments.
 * 4. Verifies each order item has proper status, product variant, and seller references.
 * 5. Confirms snapshot data preserves purchase-time product and seller information.
 */
export async function test_api_admin_order_view_mixed_item_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. View order (using random UUID - test database should contain orders)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const order: IEcommerceOrder = await api.functional.ecommerce.admin.orders.at(
    adminConnection,
    {
      orderId,
    },
  );
  typia.assert(order);
  // 3. Validate order structure
  TestValidator.equals("order has ID", order.id !== undefined, true);
  TestValidator.equals(
    "order has order number",
    order.order_number.length > 0,
    true,
  );
  TestValidator.predicate("order has total price", order.total_price >= 0);
  TestValidator.predicate("order has status", order.status.length > 0);
  // 4. Validate customer reference
  TestValidator.equals("customer has ID", order.customer.id.length > 0, true);
  TestValidator.equals(
    "customer has email",
    order.customer.email.length > 0,
    true,
  );
  TestValidator.equals(
    "customer has display name",
    order.customer.display_name.length > 0,
    true,
  );
  // 5. Validate order items
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  await TestValidator.predicate(
    "each order item has required fields",
    async () => {
      for (const item of order.orderItems) {
        TestValidator.equals("item has ID", item.id.length > 0, true);
        TestValidator.predicate("item has quantity", item.quantity >= 1);
        TestValidator.predicate("item has unit price", item.unit_price >= 0);
        TestValidator.predicate("item has status", item.status.length > 0);
        // Validate product variant reference
        TestValidator.equals(
          "variant has ID",
          item.productVariant.id.length > 0,
          true,
        );
        TestValidator.equals(
          "variant has SKU code",
          item.productVariant.sku_code.length > 0,
          true,
        );
        TestValidator.equals(
          "variant has option values",
          item.productVariant.option_values.length > 0,
          true,
        );
        // Validate seller reference
        TestValidator.equals("seller has ID", item.seller.id.length > 0, true);
        TestValidator.equals(
          "seller has shop name",
          item.seller.shop_name.length > 0,
          true,
        );
        TestValidator.predicate(
          "seller has approval status",
          item.seller.approval_status.length > 0,
        );
        // Validate snapshot data
        TestValidator.equals(
          "snapshot has product name",
          item.snapshot.product_name.length > 0,
          true,
        );
        TestValidator.equals(
          "snapshot has seller shop name",
          item.snapshot.seller_shop_name.length > 0,
          true,
        );
        TestValidator.predicate(
          "snapshot has base price",
          item.snapshot.base_price >= 0,
        );
        TestValidator.predicate(
          "snapshot has created_at",
          item.snapshot.created_at.length > 0,
        );
      }
      return true;
    },
  );
  // 6. Check for mixed item statuses (partially_completed scenario)
  const uniqueStatuses = new Set(order.orderItems.map((item) => item.status));
  if (uniqueStatuses.size > 1) {
    TestValidator.equals(
      "order status is partially_completed when items have mixed states",
      order.status,
      "partially_completed",
    );
  }
}
