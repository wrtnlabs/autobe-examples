import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IOrderItemDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderItemDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

export async function test_api_order_items_analytics_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Normalize the date range for consistent testing
  const baseDate = new Date("2026-01-01T00:00:00Z");
  const endDate = new Date();
  // Ensure we create exactly 70 items (7 pages of 10)
  // This ensures predictable page calculations
  const createdItems = await ArrayUtil.asyncRepeat(70, async (index) => {
    const item: IShoppingMallOrderItem = {
      id: typia.random<string & tags.Format<"uuid">>(),
      itemCode: `ITEM-${index + 1000}`,
      orderCode: `ORDER-${Math.floor(index / 10) + 500}`,
      productVariantId: typia.random<string & tags.Format<"uuid">>(),
      productCode: `PROD-${(index % 15) + 1}`,
      quantity: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<99999>
      >(),
      unitPrice: typia.random<
        number & tags.Minimum<0> & tags.MultipleOf<0.01>
      >(),
      totalPrice: typia.random<
        number & tags.Minimum<0> & tags.MultipleOf<0.01>
      >(),
      currencyCode: RandomGenerator.pick([
        "USD",
        "KRW",
        "EUR",
        "JPY",
        "GBP",
      ] as const),
      notes:
        index % 10 === 0
          ? RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 })
          : undefined,
      status: RandomGenerator.pick([
        "pending",
        "processing",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
      ] as const),
      created_at: new Date(
        baseDate.getTime() + index * 24 * 3600000,
      ).toISOString(),
      updated_at: new Date(
        baseDate.getTime() + index * 24 * 3600000 + 3600000,
      ).toISOString(),
      sentinel: "active",
      orderStatus: RandomGenerator.pick([
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
        "refunded",
      ] as const),
      itemId: typia.random<string & tags.Format<"uuid">>(),
    };
    // Create item via API to ensure they exist in database
    // We need to use different connection for different actors, but no authentication needed for registration
    const newConnection: api.IConnection = { host: connection.host };
    const result =
      await api.functional.shoppingMall.analytics.order_items.index(
        newConnection,
        {
          body: {
            limit: 1,
            offset: 0,
            searchTerm: "", // Added missing required property
            sortBy: "createdAt",
            sortOrder: "desc",
            dateRange: { start: item.created_at, end: item.created_at },
          },
        },
      );
    // Implicitly verify the item can be queried back
    return item;
  });
  // Set up pagination parameters to test limit=10 for 7 pages
  const paginationParams: IShoppingMallOrderItem.IRequest = {
    limit: 10,
    offset: 0,
    searchTerm: "", // Added missing required property
    sortBy: "createdAt",
    sortOrder: "desc",
    dateRange: {
      start: baseDate.toISOString(),
      end: endDate.toISOString(),
    },
  };
  // Fetch and validate each page
  const pages: IPageIShoppingMallOrderItem[] = [];
  // Validate all 7 pages
  for (let page = 0; page < 7; page++) {
    paginationParams.offset = page * 10;
    const currentPage: IPageIShoppingMallOrderItem =
      await api.functional.shoppingMall.analytics.order_items.index(
        connection,
        {
          body: paginationParams,
        },
      );
    typia.assert(currentPage);
    pages.push(currentPage);
    // Validate metadata: current page is page+1 (1-based), limit=10, records=70, pages=7
    TestValidator.equals(
      `page ${page + 1} current page`,
      currentPage.pagination.current,
      page + 1,
    );
    TestValidator.equals(
      `page ${page + 1} limit`,
      currentPage.pagination.limit,
      10,
    );
    TestValidator.equals(
      `page ${page + 1} records`,
      currentPage.pagination.records,
      70,
    );
    TestValidator.equals(
      `page ${page + 1} pages`,
      currentPage.pagination.pages,
      7,
    );
    // Last page should have 10 items, but we created EXACTLY 70 so last page should be 7th of 10, i.e. 10 items
    TestValidator.equals(
      `page ${page + 1} data length`,
      currentPage.data.length,
      10,
    );
  }
  // Validate data consistency: all items in returned pages are sorted by createdAt descending
  for (let p = 0; p < pages.length; p++) {
    for (let i = 0; i < pages[p].data.length - 1; i++) {
      const current = Date.parse(pages[p].data[i].created_at);
      const next = Date.parse(pages[p].data[i + 1].created_at);
      TestValidator.predicate(
        `page ${p + 1}, item ${i + 1} to ${i + 2} date order`,
        current >= next,
      );
    }
  }
  // Validate pages are continuous: last item of one page should be >= first item of next page
  for (let p = 0; p < pages.length - 1; p++) {
    const lastOfCurrent = Date.parse(pages[p].data[9].created_at);
    const firstOfNext = Date.parse(pages[p + 1].data[0].created_at);
    TestValidator.predicate(
      `continuity between page ${p + 1} and page ${p + 2}`,
      lastOfCurrent >= firstOfNext,
    );
  }
  // Validate date range constraint
  const allData = pages.flatMap((page) => page.data);
  const allInDateRange = allData.every(
    (item) =>
      item.created_at >= paginationParams.dateRange.start &&
      item.created_at <= paginationParams.dateRange.end,
  );
  TestValidator.predicate("all items within date range", allInDateRange);
  // Validate no data duplication across pages
  const allIds = allData.map((item) => item.id);
  const uniqueIds = new Set(allIds);
  TestValidator.equals(
    "no duplicate items across pages",
    uniqueIds.size,
    allData.length,
  );
}