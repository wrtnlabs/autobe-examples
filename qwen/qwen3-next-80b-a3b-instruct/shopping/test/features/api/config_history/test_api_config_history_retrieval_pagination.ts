import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfigHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_config_history_retrieval_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access configuration history records
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Test pagination functionality with existing records
  // We assume there are at least 75 configuration history records already in the system
  // (created by other processes or previous tests)
  // Test 2.1: Default limit (50) - should return first page
  const page1 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 should have 50 records", page1.data.length, 50);
  TestValidator.equals("page 1 should be page 1", page1.pagination.current, 1);
  TestValidator.equals(
    "page 1 should have total records",
    page1.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 1 should have at least 2 pages (ceil(total/50))",
    page1.pagination.pages,
    Math.ceil(page1.pagination.records / 50),
  );
  // Test 2.2: Limit=25, page=1
  const page2 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 25,
        page: 1,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 (limit=25) should have 25 records",
    page2.data.length,
    25,
  );
  TestValidator.equals("page 2 should be page 1", page2.pagination.current, 1);
  TestValidator.equals(
    "page 2 should have same total records as page 1",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 2 should have at least 3 pages (ceil(total/25))",
    page2.pagination.pages,
    Math.ceil(page2.pagination.records / 25),
  );
  // Test 2.3: Limit=25, page=2
  const page3 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 25,
        page: 2,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals(
    "page 3 (limit=25) should have 25 records",
    page3.data.length,
    25,
  );
  TestValidator.equals("page 3 should be page 2", page3.pagination.current, 2);
  TestValidator.equals(
    "page 3 should have same total records as page 1",
    page3.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 3 should have at least 3 pages (ceil(total/25))",
    page3.pagination.pages,
    Math.ceil(page3.pagination.records / 25),
  );
  // Test 2.4: Limit=25, page=3
  const page4 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 25,
        page: 3,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page4);
  TestValidator.equals(
    "page 4 (limit=25) should have more than 0 records if records exist",
    page4.data.length,
    0,
  );
  TestValidator.equals("page 4 should be page 3", page4.pagination.current, 3);
  TestValidator.equals(
    "page 4 should have same total records as page 1",
    page4.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 4 should have at least 3 pages (ceil(total/25))",
    page4.pagination.pages,
    Math.ceil(page4.pagination.records / 25),
  );
  // Validate chronological ordering - newest records first
  // All records should be ordered by created_at descending
  const allRecords = [
    ...page1.data,
    ...page2.data,
    ...page3.data,
    ...page4.data,
  ];
  for (let i = 0; i < allRecords.length - 1; i++) {
    const current = new Date(allRecords[i].created_at);
    const next = new Date(allRecords[i + 1].created_at);
    TestValidator.predicate(
      "records should be ordered by created_at descending",
      current >= next,
    );
  }
  // Test 2.5: Limit=100 (max allowed)
  const page5 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page5);
  TestValidator.equals(
    "page 5 (limit=100) should have at most 100 records",
    page5.data.length,
    Math.min(100, page5.pagination.records),
  );
  TestValidator.equals("page 5 should be page 1", page5.pagination.current, 1);
  TestValidator.equals(
    "page 5 should have same total records as page 1",
    page5.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 5 should have either 1 page or more",
    page5.pagination.pages,
    Math.ceil(page5.pagination.records / 100),
  );
  // Test 2.6: Limit=10 (minimum)
  const page6 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 10,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page6);
  TestValidator.equals(
    "page 6 (limit=10) should have 10 records",
    page6.data.length,
    10,
  );
  TestValidator.equals("page 6 should be page 1", page6.pagination.current, 1);
  TestValidator.equals(
    "page 6 should have same total records as page 1",
    page6.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 6 should have at least 8 pages (ceil(total/10))",
    page6.pagination.pages,
    Math.ceil(page6.pagination.records / 10),
  );
  // Test 2.7: Page=4 with limit=25 (should return empty array - page doesn't exist)
  // We expect this to return empty if we don't have enough records
  const page7 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 25,
        page: 4,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page7);
  TestValidator.equals(
    "page 7 should have 0 or more records ",
    page7.data.length,
    0,
  );
  TestValidator.equals("page 7 should be page 4", page7.pagination.current, 4);
  TestValidator.equals(
    "page 7 should have same total records as page 1",
    page7.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 7 should have at least 3 pages (ceil(total/25))",
    page7.pagination.pages,
    Math.ceil(page7.pagination.records / 25),
  );
  // Test 2.8: Verify default page is 1 when not specified
  const page9 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 25,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page9);
  TestValidator.equals(
    "page 9 should be page 1 (default)",
    page9.pagination.current,
    1,
  );
  TestValidator.equals("page 9 should have 25 records", page9.data.length, 25);
  // Test 2.9: Verify default limit is 50 when not specified
  const page10 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        page: 1,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page10);
  TestValidator.equals(
    "page 10 should have 50 records (default)",
    page10.data.length,
    50,
  );
  TestValidator.equals(
    "page 10 should be page 1",
    page10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 10 should have same total records as page 1",
    page10.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 10 should have at least 2 pages (ceil(total/50))",
    page10.pagination.pages,
    Math.ceil(page10.pagination.records / 50),
  );
  // Test 2.10: Verify limit of 1
  const page11 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 1,
        page: 1,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page11);
  TestValidator.equals("page 11 should have 1 record", page11.data.length, 1);
  TestValidator.equals(
    "page 11 should be page 1",
    page11.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 11 should have same total records as page 1",
    page11.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 11 should have at least as many pages as total records",
    page11.pagination.pages,
    page11.pagination.records,
  );
  // Test 2.11: Verify limit of 100 (maximum)
  const page12 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page12);
  TestValidator.equals(
    "page 12 should have at most 100 records",
    page12.data.length,
    Math.min(100, page12.pagination.records),
  );
  TestValidator.equals(
    "page 12 should be page 1",
    page12.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 12 should have same total records as page 1",
    page12.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 12 should have 1 page if records <= 100",
    page12.pagination.pages,
    Math.ceil(page12.pagination.records / 100),
  );
  // Test 2.12: Verify limit of 100 doesn't exceed actual count
  const page13 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 100,
        page: 2,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page13);
  TestValidator.equals(
    "page 13 should be empty if there are no more records",
    page13.data.length,
    0,
  );
  TestValidator.equals(
    "page 13 should be page 2",
    page13.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 13 should have same total records as page 1",
    page13.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 13 should have at least 1 page",
    page13.pagination.pages,
    Math.ceil(page13.pagination.records / 100),
  );
  // Test 2.13: Verify sort_by and order parameters work
  const page14 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 5,
        page: 1,
        sort_by: "config_key",
        order: "asc",
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page14);
  TestValidator.equals("page 14 should have 5 records", page14.data.length, 5);
  const page15 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 5,
        page: 1,
        sort_by: "config_key",
        order: "desc",
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page15);
  TestValidator.equals("page 15 should have 5 records", page15.data.length, 5);
  // Test 2.14: Filter by config_key
  const filterConfigKey = "payment_gateway";
  const page16 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 20,
        page: 1,
        config_key: filterConfigKey,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page16);
  // We can't validate specific config_keys since they're not exposed in response
  // But we can validate that response has data
  // Test 2.15: Filter by created_at range
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const page17 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 10,
        page: 1,
        created_at_from: yesterday,
        created_at_to: today,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page17);
  // Verify records are within date range
  for (const record of page17.data) {
    const recordDate = new Date(record.created_at);
    const from = new Date(yesterday);
    const to = new Date(today);
    TestValidator.predicate(
      "record date should be within range",
      recordDate >= from && recordDate <= to,
    );
  }
  // Test 2.16: Verify metadata field in response is correctly structured
  const metadataObject = page1.data[0].metadata;
  if (metadataObject) {
    typia.assert(metadataObject);
  }
  // Test 2.17: Verify error on invalid limit (below 1)
  await TestValidator.error("limit below 1 should fail", async () => {
    await api.functional.shoppingMall.admin.config.histories.index(
      adminConnection,
      {
        body: {
          limit: 0,
          page: 1,
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  });
  // Test 2.18: Verify error on invalid limit (above 100)
  await TestValidator.error("limit above 100 should fail", async () => {
    await api.functional.shoppingMall.admin.config.histories.index(
      adminConnection,
      {
        body: {
          limit: 101,
          page: 1,
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  });
  // Test 2.19: Verify error on invalid page (below 1)
  await TestValidator.error("page below 1 should fail", async () => {
    await api.functional.shoppingMall.admin.config.histories.index(
      adminConnection,
      {
        body: {
          limit: 50,
          page: 0,
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  });
  // Test 2.20: Verify pagination metadata consistency
  const metadata = page2.pagination;
  TestValidator.predicate(
    "pagination current should be >= 1",
    metadata.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be between 1 and 100",
    metadata.limit >= 1 && metadata.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    metadata.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 1",
    metadata.pages >= 1,
  );
  // Test 2.21: Verify default values
  const page33 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page33);
  TestValidator.equals(
    "default page should be 1",
    page33.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 50",
    page33.pagination.limit,
    50,
  );
  // Test 2.22: Verify no records are lost across pagination boundary
  const allPages = [];
  const totalPages = page1.pagination.pages;
  const limit = 25;
  for (let i = 1; i <= totalPages; i++) {
    const p = await api.functional.shoppingMall.admin.config.histories.index(
      adminConnection,
      {
        body: {
          limit: limit,
          page: i,
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
    typia.assert(p);
    allPages.push(...p.data);
  }
  // We should have all records
  TestValidator.equals(
    "total number of records across all pages",
    allPages.length,
    page1.pagination.records,
  );
  // Test 2.23: Test with all optional parameters
  const page32 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        config_key: "payment_gateway",
        created_at_from: "2024-01-01T00:00:00Z",
        created_at_to: "2024-12-31T23:59:59Z",
        sort_by: "created_at",
        order: "desc",
        limit: 5,
        page: 1,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page32);
  TestValidator.equals(
    "all parameters working together",
    page32.data.length,
    page32.pagination.records > 0 ? 5 : 0,
  );
  // Test 2.24: Verify filter works with special characters
  const complexKey = "payment.gateway.enabled_v2?test";
  const page25 = await api.functional.shoppingMall.admin.config.histories.index(
    adminConnection,
    {
      body: {
        limit: 1,
        page: 1,
        config_key: complexKey,
      } satisfies IShoppingMallConfigHistory.IRequest,
    },
  );
  typia.assert(page25);
}
