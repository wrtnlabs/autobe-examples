import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test successful retrieval of seller orders with pagination.
 *
 * This test verifies:
 * 1) Seller must authenticate to access seller orders endpoint
 * 2) Orders endpoint returns paginated results with proper metadata
 * 3) Response includes pagination information (current page, limit, records, pages)
 * 4) Data array contains order summaries with required fields (id, orderNumber, totalPrice, status, createdAt)
 * 5) Orders are sorted by newest first (createdAt descending)
 * 6) Pagination works correctly (different records on different pages)
 */
export async function test_api_seller_order_pagination_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // Step 2: Call orders endpoint with page 1 (default limit 20)
  const page1Result = await api.functional.ecommerceMall.seller.orders.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(page1Result);
  // Step 3: Verify pagination metadata structure
  TestValidator.predicate("pagination exists and has valid structure", () => {
    return (
      typia.is<IPage.IPagination>(page1Result.pagination) &&
      typia.is<IEcommerceMallOrder.ISummary[]>(page1Result.data)
    );
  });
  // Step 4: Verify pagination fields are populated correctly
  TestValidator.equals("current page is 1", page1Result.pagination.current, 1);
  TestValidator.equals("limit is 20", page1Result.pagination.limit, 20);
  TestValidator.predicate("records >= 0", page1Result.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", page1Result.pagination.pages >= 0);
  // Step 5: Verify data array matches expected structure for each order
  for (const order of page1Result.data) {
    TestValidator.predicate(
      "order has valid UUID id",
      typia.is<string & tags.Format<"uuid">>(order.id),
    );
    TestValidator.predicate(
      "order has orderNumber",
      typeof order.orderNumber === "string",
    );
    TestValidator.predicate(
      "order has numeric totalPrice",
      typeof order.totalPrice === "number",
    );
    TestValidator.predicate(
      "order has valid status",
      [
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "partially_completed",
      ].includes(order.status),
    );
    TestValidator.predicate(
      "order has valid createdAt date",
      typia.is<string & tags.Format<"date-time">>(order.createdAt),
    );
  }
  // Step 6: Verify sorting by newest first (if there are multiple orders)
  if (page1Result.data.length >= 2) {
    const timestamps = page1Result.data.map((order) =>
      new Date(order.createdAt).getTime(),
    );
    const sortedDescending = [...timestamps].sort((a, b) => b - a);
    TestValidator.equals(
      "orders sorted by newest first",
      timestamps,
      sortedDescending,
    );
  }
  // Step 7: Test pagination by requesting page 2 (if total records > page limit)
  if (page1Result.pagination.records > page1Result.pagination.limit) {
    const page2Result = await api.functional.ecommerceMall.seller.orders.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
    typia.assert(page2Result);
    // Verify page 2 metadata
    TestValidator.equals(
      "page 2 current is 2",
      page2Result.pagination.current,
      2,
    );
    // Verify different records on page 2
    const page1Ids = new Set(page1Result.data.map((order) => order.id));
    const page2Ids = new Set(page2Result.data.map((order) => order.id));
    TestValidator.predicate("page 2 has different orders than page 1", () => {
      for (const id of page2Ids) {
        if (page1Ids.has(id)) return false;
      }
      return true;
    });
  }
}
