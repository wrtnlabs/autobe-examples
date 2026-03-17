import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_pending_shipments_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(sellerAuth);
  // 2. Test pagination with default parameters
  const page1 =
    await api.functional.ecommerceMall.seller.order_items.pending_shipments.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 10", page1.pagination.limit, 10);
  // 3. Test pagination with different page and limit
  const page2 =
    await api.functional.ecommerceMall.seller.order_items.pending_shipments.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  TestValidator.equals("limit is 5", page2.pagination.limit, 5);
  // 4. Test status filter - only paid items
  const statusFiltered =
    await api.functional.ecommerceMall.seller.order_items.pending_shipments.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(statusFiltered);
  // Verify all returned items have status 'paid'
  for (const item of statusFiltered.data) {
    TestValidator.equals("item status is paid", item.status, "paid");
  }
  // 5. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const dateFiltered =
    await api.functional.ecommerceMall.seller.order_items.pending_shipments.index(
      sellerConnection,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(dateFiltered);
  // Verify all returned items are within the date range
  for (const item of dateFiltered.data) {
    const itemDate = new Date(item.createdAt);
    TestValidator.predicate(
      "item created after from date",
      itemDate >= oneDayAgo,
    );
    TestValidator.predicate("item created before to date", itemDate <= now);
  }
  // 6. Test sorting by created_at (descending - default)
  const sortByCreatedAt =
    await api.functional.ecommerceMall.seller.order_items.pending_shipments.index(
      sellerConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(sortByCreatedAt);
  // Verify items are sorted by created_at descending
  if (sortByCreatedAt.data.length > 1) {
    for (let i = 1; i < sortByCreatedAt.data.length; i++) {
      TestValidator.predicate(
        "items sorted by created_at descending",
        new Date(sortByCreatedAt.data[i - 1].createdAt) >=
          new Date(sortByCreatedAt.data[i].createdAt),
      );
    }
  }
  // 7. Test sorting by status
  const sortByStatus =
    await api.functional.ecommerceMall.seller.order_items.pending_shipments.index(
      sellerConnection,
      {
        body: {
          sort_by: "status",
          sort_order: "asc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(sortByStatus);
  // 8. Test sorting by quantity
  const sortByQuantity =
    await api.functional.ecommerceMall.seller.order_items.pending_shipments.index(
      sellerConnection,
      {
        body: {
          sort_by: "quantity",
          sort_order: "desc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(sortByQuantity);
  // 9. Test sorting by unit_price
  const sortByPrice =
    await api.functional.ecommerceMall.seller.order_items.pending_shipments.index(
      sellerConnection,
      {
        body: {
          sort_by: "unit_price",
          sort_order: "asc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(sortByPrice);
  // 10. Test combined filters
  const combinedFilter =
    await api.functional.ecommerceMall.seller.order_items.pending_shipments.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          created_at_from: twoDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(combinedFilter);
  // Verify combined filter results
  for (const item of combinedFilter.data) {
    TestValidator.equals("item status is paid", item.status, "paid");
    const itemDate = new Date(item.createdAt);
    TestValidator.predicate(
      "item within date range",
      itemDate >= twoDaysAgo && itemDate <= now,
    );
  }
  // 11. Test pagination metadata accuracy
  TestValidator.equals(
    "pagination current >= 1",
    page1.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit > 0",
    page1.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records >= 0",
    page1.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages >= 0",
    page1.pagination.pages >= 0,
    true,
  );
}
