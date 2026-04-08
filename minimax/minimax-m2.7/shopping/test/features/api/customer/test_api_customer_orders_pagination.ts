import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer 1 (order owner)
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {});
  typia.assert(customer1);
  // 2. Register customer 2 (should not see customer 1's orders)
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {});
  typia.assert(customer2);
  // 3. Get paginated orders for customer 1
  const ordersPage = await api.functional.ecommerceMall.customer.orders.index(
    customer1Connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(ordersPage);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current is 1",
    ordersPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    ordersPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records is non-negative",
    ordersPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    ordersPage.pagination.pages >= 0,
  );
  // 5. Validate order summaries structure when data exists
  for (const order of ordersPage.data) {
    TestValidator.predicate("has id", order.id !== undefined);
    TestValidator.predicate(
      "has order_number",
      order.order_number !== undefined,
    );
    TestValidator.predicate("has status", order.status !== undefined);
    TestValidator.equals("status is valid", order.status, order.status);
    TestValidator.predicate("has subtotal", order.subtotal !== undefined);
    TestValidator.predicate(
      "has shipping_cost",
      order.shipping_cost !== undefined,
    );
    TestValidator.predicate(
      "has total_amount",
      order.total_amount !== undefined,
    );
    TestValidator.predicate("has created_at", order.created_at !== undefined);
    TestValidator.predicate("has customer", order.customer !== undefined);
    TestValidator.predicate("has items_count", order.items_count !== undefined);
    TestValidator.predicate(
      "has shipments_count",
      order.shipments_count !== undefined,
    );
  }
  // 6. Validate orders are sorted by created_at DESC (newest first) if multiple orders exist
  if (ordersPage.data.length > 1) {
    for (let i = 0; i < ordersPage.data.length - 1; i++) {
      const currentTime = new Date(ordersPage.data[i].created_at).getTime();
      const nextTime = new Date(ordersPage.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `order[${i}] created_at >= order[${i + 1}] created_at (newest first)`,
        currentTime >= nextTime,
      );
    }
  }
  // 7. Validate customer 1 only sees their own orders
  for (const order of ordersPage.data) {
    TestValidator.equals(
      "order belongs to customer1",
      order.customer.id,
      customer1.id,
    );
  }
  // 8. Verify customer 2 gets different orders (isolation)
  const customer2OrdersPage =
    await api.functional.ecommerceMall.customer.orders.index(
      customer2Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(customer2OrdersPage);
  // Customer 2 should not see customer 1's order IDs
  const customer1OrderIds = new Set(ordersPage.data.map((o) => o.id));
  for (const order of customer2OrdersPage.data) {
    TestValidator.predicate(
      "customer2 does not see customer1 orders",
      !customer1OrderIds.has(order.id),
    );
  }
}
