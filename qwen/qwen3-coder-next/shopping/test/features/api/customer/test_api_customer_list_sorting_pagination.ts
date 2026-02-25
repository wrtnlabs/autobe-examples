import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test customer list sorting and pagination functionality.
 * Tests sorting by created_at and updated_at in both ascending and descending order.
 * Validates pagination metadata and data consistency across pages.
 */
export async function test_api_customer_list_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Use existing customers and test sorting/pagination directly
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Test sorting by created_at DESC (newest first)
  const sortedByCreatedDesc = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
        page: 1,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(sortedByCreatedDesc);
  // Verify sorting: newest customers should appear first
  TestValidator.equals(
    "created_at desc count",
    sortedByCreatedDesc.data.length,
    10,
  );
  for (let i = 0; i < sortedByCreatedDesc.data.length - 1; i++) {
    const createdAtA = new Date(
      sortedByCreatedDesc.data[i].created_at,
    ).getTime();
    const createdAtB = new Date(
      sortedByCreatedDesc.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate("created_at descending", createdAtA >= createdAtB);
  }
  // 3. Test sorting by created_at ASC (oldest first)
  const sortedByCreatedAsc = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        limit: 10,
        page: 1,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(sortedByCreatedAsc);
  // Verify sorting: oldest customers should appear first
  for (let i = 0; i < sortedByCreatedAsc.data.length - 1; i++) {
    const createdAtA = new Date(
      sortedByCreatedAsc.data[i].created_at,
    ).getTime();
    const createdAtB = new Date(
      sortedByCreatedAsc.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate("created_at ascending", createdAtA <= createdAtB);
  }
  // 4. Test sorting by updated_at DESC
  const sortedByUpdatedDesc = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        sort_by: "updated_at",
        sort_order: "desc",
        limit: 10,
        page: 1,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(sortedByUpdatedDesc);
  // Verify sorting: most recently updated customers should appear first
  for (let i = 0; i < sortedByUpdatedDesc.data.length - 1; i++) {
    const updatedAtA = new Date(
      sortedByUpdatedDesc.data[i].updated_at,
    ).getTime();
    const updatedAtB = new Date(
      sortedByUpdatedDesc.data[i + 1].updated_at,
    ).getTime();
    TestValidator.predicate("updated_at descending", updatedAtA >= updatedAtB);
  }
  // 5. Test sorting by updated_at ASC
  const sortedByUpdatedAsc = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        sort_by: "updated_at",
        sort_order: "asc",
        limit: 10,
        page: 1,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(sortedByUpdatedAsc);
  // Verify sorting: least recently updated customers should appear first
  for (let i = 0; i < sortedByUpdatedAsc.data.length - 1; i++) {
    const updatedAtA = new Date(
      sortedByUpdatedAsc.data[i].updated_at,
    ).getTime();
    const updatedAtB = new Date(
      sortedByUpdatedAsc.data[i + 1].updated_at,
    ).getTime();
    TestValidator.predicate("updated_at ascending", updatedAtA <= updatedAtB);
  }
  // 6. Test pagination with multiple pages (limit=10)
  const page1 = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
        page: 1,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("pagination page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "pagination page 1 records",
    page1.pagination.records,
    page1.data.length,
  );
  TestValidator.equals(
    "pagination page 1 pages",
    page1.pagination.pages,
    Math.ceil(page1.pagination.records / 10),
  );
  TestValidator.equals(
    "pagination page 1 current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("pagination page 1 data count", page1.data.length, 10);
  const page2 = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
        page: 2,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "pagination page 2 current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("pagination page 2 data count", page2.data.length, 10);
  const page3 = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
        page: 3,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals(
    "pagination page 3 current",
    page3.pagination.current,
    3,
  );
  TestValidator.equals(
    "pagination page 3 data count",
    page3.data.length,
    Math.max(0, page1.pagination.records - 20),
  );
  // 7. Verify pagination consistency across pages
  const allPages = [page1, page2, page3];
  const allCustomers: IShoppingMallCustomer.ISummary[] = [];
  for (const page of allPages) {
    allCustomers.push(...page.data);
  }
  TestValidator.equals(
    "total customers across pages",
    allCustomers.length,
    page1.pagination.records,
  );
  // Verify sorting consistency across all pages
  for (let i = 0; i < allCustomers.length - 1; i++) {
    const createdAtA = new Date(allCustomers[i].created_at).getTime();
    const createdAtB = new Date(allCustomers[i + 1].created_at).getTime();
    TestValidator.predicate("cross-page sorting", createdAtA >= createdAtB);
  }
  // 8. Test default pagination values (no limit or page specified)
  const defaultPagination = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(defaultPagination);
  TestValidator.equals(
    "default pagination limit",
    defaultPagination.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default pagination page",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination records",
    defaultPagination.pagination.records,
    page1.pagination.records,
  );
}
