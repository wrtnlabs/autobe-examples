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

export async function test_api_admin_order_items_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    },
  });
  // 2. Calculate date range for filtering (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const createdAtFrom = thirtyDaysAgo.toISOString();
  const createdAtTo = now.toISOString();
  // 3. Define status filter for IN clause testing (multiple statuses)
  const statusFilter: (
    | "paid"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
  )[] = ["paid", "shipped"];
  // 4. Query order items with combined filters: date range + status IN clause
  const filteredResult =
    await api.functional.ecommerceMall.admin.order_items.index(
      adminConnection,
      {
        body: {
          status: statusFilter,
          created_at_from: createdAtFrom,
          created_at_to: createdAtTo,
          limit: 50,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 5. Validate filtered results - all items should match filters
  if (filteredResult.data.length > 0) {
    // All items should be within date range
    for (const item of filteredResult.data) {
      const itemDate = new Date(item.created_at);
      TestValidator.predicate(
        "order item within date range",
        itemDate >= thirtyDaysAgo && itemDate <= now,
      );
    }
    // All items should match status filter (IN clause)
    for (const item of filteredResult.data) {
      TestValidator.predicate(
        "status matches IN clause filter",
        statusFilter.includes(
          item.status as
            | "paid"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "refunded",
        ),
      );
    }
    // All items should have correct subtotal calculation (quantity * unit_price)
    for (const item of filteredResult.data) {
      const expectedSubtotal = item.quantity * item.unit_price;
      TestValidator.equals(
        "subtotal calculation correct",
        item.subtotal,
        expectedSubtotal,
      );
    }
    // Validate subtotal is positive number
    for (const item of filteredResult.data) {
      TestValidator.predicate("subtotal is positive", item.subtotal > 0);
    }
    // Validate item has required properties
    for (const item of filteredResult.data) {
      TestValidator.predicate(
        "item has id",
        item.id !== undefined && item.id !== null,
      );
      TestValidator.predicate("item has quantity", item.quantity > 0);
      TestValidator.predicate(
        "item has unit_price",
        item.unit_price !== undefined && item.unit_price !== null,
      );
    }
    // Validate nested order and customer data
    for (const item of filteredResult.data) {
      TestValidator.predicate(
        "order exists",
        item.order !== undefined && item.order !== null,
      );
      TestValidator.predicate(
        "customer exists",
        item.order.customer !== undefined && item.order.customer !== null,
      );
      TestValidator.predicate(
        "product snapshot exists",
        item.productSnapshot !== undefined && item.productSnapshot !== null,
      );
      TestValidator.predicate(
        "seller profile snapshot exists",
        item.sellerProfileSnapshot !== undefined &&
          item.sellerProfileSnapshot !== null,
      );
    }
  }
  // 6. Test with different status combinations for IN clause
  const cancelledRefundedStatuses: (
    | "paid"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
  )[] = ["cancelled", "refunded"];
  const cancelledRefundedResult =
    await api.functional.ecommerceMall.admin.order_items.index(
      adminConnection,
      {
        body: {
          status: cancelledRefundedStatuses,
          created_at_from: createdAtFrom,
          created_at_to: createdAtTo,
          limit: 50,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(cancelledRefundedResult);
  // All items should match cancelled/refunded status
  for (const item of cancelledRefundedResult.data) {
    TestValidator.predicate(
      "status is cancelled or refunded",
      cancelledRefundedStatuses.includes(
        item.status as
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded",
      ),
    );
  }
  // 7. Test with only date range filter (no status filter)
  const dateOnlyResult =
    await api.functional.ecommerceMall.admin.order_items.index(
      adminConnection,
      {
        body: {
          created_at_from: createdAtFrom,
          created_at_to: createdAtTo,
          limit: 50,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(dateOnlyResult);
  // All items should be within date range
  for (const item of dateOnlyResult.data) {
    const itemDate = new Date(item.created_at);
    TestValidator.predicate(
      "order item within date range",
      itemDate >= thirtyDaysAgo && itemDate <= now,
    );
  }
  // 8. Test pagination metadata is correct
  TestValidator.predicate(
    "pagination has current page",
    filteredResult.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    filteredResult.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records count",
    filteredResult.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages count",
    filteredResult.pagination.pages !== undefined,
  );
  // 9. Test sorting by created_at
  const sortedResult =
    await api.functional.ecommerceMall.admin.order_items.index(
      adminConnection,
      {
        body: {
          created_at_from: createdAtFrom,
          created_at_to: createdAtTo,
          sort_by: "created_at",
          sort_direction: "desc",
          limit: 20,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedResult);
  // Validate descending order by created_at
  if (sortedResult.data.length > 1) {
    for (let i = 0; i < sortedResult.data.length - 1; i++) {
      const currentDate = new Date(sortedResult.data[i].created_at);
      const nextDate = new Date(sortedResult.data[i + 1].created_at);
      TestValidator.predicate(
        "sorted descending by created_at",
        currentDate >= nextDate,
      );
    }
  }
}
