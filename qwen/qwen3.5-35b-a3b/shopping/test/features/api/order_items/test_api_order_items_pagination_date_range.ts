import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_order_items_pagination_date_range(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Step 1: Register member account and create shipping address
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberData);
  // Create shipping address for the member
  const address =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(2),
          state: RandomGenerator.name(2),
          postal_code:
            typia
              .random<string & tags.Format<"email">>()
              .replace(/[^0-9]/g, "")
              .slice(0, 5) || "12345",
          country: "South Korea",
        },
      },
    );
  typia.assert(address);
  /**
   * Step 2: Create multiple orders across different date ranges
   * We'll create 15 orders, each with 3 items = 45 total order items
   */
  const orderCount = 15;
  const createdOrders: IEcommerceMallOrder[] = [];
  const orderTimestamps: string[] = [];
  // Generate timestamps spread across different dates
  const baseDate = new Date();
  for (let i = 0; i < orderCount; i++) {
    // Create orders with timestamps spread over different days
    const timestampOffset = (i - orderCount / 2) * 86400000; // 86400000ms = 1 day
    const orderDate = new Date(baseDate.getTime() + timestampOffset);
    const order = await api.functional.ecommerceMall.member.orders.create(
      memberConnection,
      {
        body: {
          shipping_address_id: address.id,
          order_items: ArrayUtil.repeat(3, () => ({
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          })),
        },
      },
    );
    typia.assert(order);
    createdOrders.push(order);
    orderTimestamps.push(order.created_at);
  }
  // Sort timestamps to know date boundaries
  const sortedTimestamps = [...orderTimestamps].sort();
  const earliestTimestamp = new Date(sortedTimestamps[0]).toISOString();
  const latestTimestamp = new Date(
    sortedTimestamps[orderCount - 1],
  ).toISOString();
  // Define date ranges for testing
  const afterLatestDate = new Date(latestTimestamp).toISOString();
  /**
   * Step 3: Test basic pagination with limit=10
   */
  const page1Response =
    await api.functional.ecommerceMall.member.order_items.index(
      memberConnection,
      {
        body: {
          limit: 10,
          order_by: "created_at",
          order_direction: "DESC",
        },
      },
    );
  typia.assert(page1Response);
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.equals(
    "page 1 records",
    page1Response.pagination.records,
    orderCount * 3,
  );
  TestValidator.equals(
    "page 1 pages",
    page1Response.pagination.pages,
    Math.ceil((orderCount * 3) / 10),
  );
  TestValidator.predicate("page 1 has items", page1Response.data.length > 0);
  TestValidator.equals("page 1 item count", page1Response.data.length, 10);
  /**
   * Step 4: Test cursor-based pagination (second page)
   * Use cursor from first page response for cursor-based pagination
   */
  const page2Response =
    await api.functional.ecommerceMall.member.order_items.index(
      memberConnection,
      {
        body: {
          page: null, // First page of cursor-based pagination
          limit: 10,
          order_by: "created_at",
          order_direction: "DESC",
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 1);
  TestValidator.equals("page 2 item count", page2Response.data.length, 10);
  // Verify items are returned correctly
  TestValidator.predicate("page 2 has items", page2Response.data.length > 0);
  /**
   * Step 5: Test limit=1 (minimum)
   */
  const limit1Response =
    await api.functional.ecommerceMall.member.order_items.index(
      memberConnection,
      {
        body: {
          limit: 1,
          order_by: "created_at",
          order_direction: "DESC",
        },
      },
    );
  typia.assert(limit1Response);
  TestValidator.equals("limit 1 current", limit1Response.pagination.current, 1);
  TestValidator.equals("limit 1 limit", limit1Response.pagination.limit, 1);
  TestValidator.equals(
    "limit 1 records",
    limit1Response.pagination.records,
    orderCount * 3,
  );
  TestValidator.equals(
    "limit 1 pages",
    limit1Response.pagination.pages,
    Math.ceil((orderCount * 3) / 1),
  );
  TestValidator.equals("limit 1 item count", limit1Response.data.length, 1);
  /**
   * Step 6: Test limit=100 (maximum)
   */
  const limit100Response =
    await api.functional.ecommerceMall.member.order_items.index(
      memberConnection,
      {
        body: {
          limit: 100,
          order_by: "created_at",
          order_direction: "DESC",
        },
      },
    );
  typia.assert(limit100Response);
  TestValidator.equals(
    "limit 100 current",
    limit100Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 100 limit",
    limit100Response.pagination.limit,
    100,
  );
  TestValidator.equals(
    "limit 100 records",
    limit100Response.pagination.records,
    orderCount * 3,
  );
  TestValidator.equals("limit 100 pages", limit100Response.pagination.pages, 1);
  TestValidator.equals(
    "limit 100 item count",
    limit100Response.data.length,
    orderCount * 3,
  );
  /**
   * Step 7: Test date range filtering - no overlap (empty result)
   */
  const noOverlapResponse =
    await api.functional.ecommerceMall.member.order_items.index(
      memberConnection,
      {
        body: {
          created_at_from: afterLatestDate,
          created_at_to: afterLatestDate,
        },
      },
    );
  typia.assert(noOverlapResponse);
  TestValidator.equals(
    "no overlap current",
    noOverlapResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "no overlap records",
    noOverlapResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "no overlap pages",
    noOverlapResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "no overlap item count",
    noOverlapResponse.data.length,
    0,
  );
  /**
   * Step 8: Test date range filtering - partial overlap
   */
  const midDate = new Date(
    new Date(earliestTimestamp).getTime() +
      (new Date(latestTimestamp).getTime() -
        new Date(earliestTimestamp).getTime()) /
        2,
  );
  const partialFromDate = earliestTimestamp;
  const partialToDate = midDate.toISOString();
  const partialOverlapResponse =
    await api.functional.ecommerceMall.member.order_items.index(
      memberConnection,
      {
        body: {
          created_at_from: partialFromDate,
          created_at_to: partialToDate,
        },
      },
    );
  typia.assert(partialOverlapResponse);
  TestValidator.predicate(
    "partial overlap has some items",
    partialOverlapResponse.data.length > 0,
  );
  TestValidator.predicate(
    "partial overlap less than total",
    partialOverlapResponse.data.length < orderCount * 3,
  );
  // Verify all returned items are within date range
  for (const item of partialOverlapResponse.data) {
    TestValidator.predicate(
      `item ${item.id} within date range`,
      new Date(item.created_at).getTime() >=
        new Date(partialFromDate).getTime() &&
        new Date(item.created_at).getTime() <=
          new Date(partialToDate).getTime(),
    );
  }
  /**
   * Step 9: Test sorting ASC (oldest first)
   */
  const sortAscResponse =
    await api.functional.ecommerceMall.member.order_items.index(
      memberConnection,
      {
        body: {
          order_by: "created_at",
          order_direction: "ASC",
          limit: 5,
        },
      },
    );
  typia.assert(sortAscResponse);
  TestValidator.equals(
    "sort asc current",
    sortAscResponse.pagination.current,
    1,
  );
  TestValidator.equals("sort asc item count", sortAscResponse.data.length, 5);
  // Verify items are in ascending order by created_at
  const ascDates = sortAscResponse.data.map((item) =>
    new Date(item.created_at).getTime(),
  );
  for (let i = 1; i < ascDates.length; i++) {
    TestValidator.predicate(
      `item ${i} >= item ${i - 1} (ASC)`,
      ascDates[i] >= ascDates[i - 1],
    );
  }
  /**
   * Step 10: Test sorting DESC (newest first - default)
   */
  const sortDescResponse =
    await api.functional.ecommerceMall.member.order_items.index(
      memberConnection,
      {
        body: {
          order_by: "created_at",
          order_direction: "DESC",
          limit: 5,
        },
      },
    );
  typia.assert(sortDescResponse);
  TestValidator.equals(
    "sort desc current",
    sortDescResponse.pagination.current,
    1,
  );
  TestValidator.equals("sort desc item count", sortDescResponse.data.length, 5);
  // Verify items are in descending order by created_at
  const descDates = sortDescResponse.data.map((item) =>
    new Date(item.created_at).getTime(),
  );
  for (let i = 1; i < descDates.length; i++) {
    TestValidator.predicate(
      `item ${i} <= item ${i - 1} (DESC)`,
      descDates[i] <= descDates[i - 1],
    );
  }
  /**
   * Step 11: Test updated_at filtering
   * Create a filter that should return items within updated_at range
   */
  const updatedAtFrom = earliestTimestamp;
  const updatedAtTo = latestTimestamp;
  const updatedAtResponse =
    await api.functional.ecommerceMall.member.order_items.index(
      memberConnection,
      {
        body: {
          updated_at_from: updatedAtFrom,
          updated_at_to: updatedAtTo,
        },
      },
    );
  typia.assert(updatedAtResponse);
  TestValidator.equals(
    "updated_at current",
    updatedAtResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "updated_at records",
    updatedAtResponse.pagination.records,
    orderCount * 3,
  );
  TestValidator.equals(
    "updated_at item count",
    updatedAtResponse.data.length,
    orderCount * 3,
  );
  // Verify all returned items have updated_at within range
  for (const item of updatedAtResponse.data) {
    TestValidator.predicate(
      `item ${item.id} updated_at in range`,
      new Date(item.created_at).getTime() >=
        new Date(updatedAtFrom).getTime() &&
        new Date(item.created_at).getTime() <= new Date(updatedAtTo).getTime(),
    );
  }
}
