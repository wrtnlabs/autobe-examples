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

export async function test_api_customer_list_filter_by_deleted_status(
  connection: api.IConnection,
): Promise<void> {
  // Test filtering customers by account deletion status
  // 1. Filter by isDeleted: true to get only soft-deleted accounts
  // 2. Filter by isDeleted: false to get only active accounts
  // 3. Filter without isDeleted to get all accounts
  // Step 1: Get only deleted accounts
  const deletedOnly = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: { isDeleted: true } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(deletedOnly);
  // All returned customers should have isDeleted: true
  TestValidator.predicate(
    "all customers should be deleted when isDeleted: true",
    deletedOnly.data.every((customer) => customer.isDeleted === true),
  );
  // Step 2: Get only active accounts
  const activeOnly = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: { isDeleted: false } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(activeOnly);
  // All returned customers should have isDeleted: false
  TestValidator.predicate(
    "all customers should be active when isDeleted: false",
    activeOnly.data.every((customer) => customer.isDeleted === false),
  );
  // Step 3: Get all accounts (both active and deleted)
  const allCustomers = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(allCustomers);
  // Total should equal sum of deleted and active counts
  TestValidator.equals(
    "total count should equal deleted + active counts",
    allCustomers.pagination.records,
    deletedOnly.pagination.records + activeOnly.pagination.records,
  );
  // Step 4: Verify deleted accounts have preserved profile information
  if (deletedOnly.data.length > 0) {
    const deletedCustomer = deletedOnly.data[0];
    typia.assert(deletedCustomer);
    TestValidator.predicate(
      "deleted customer has valid id",
      deletedCustomer.id !== null && deletedCustomer.id !== undefined,
    );
    TestValidator.predicate(
      "deleted customer has valid email",
      deletedCustomer.email !== null && deletedCustomer.email !== undefined,
    );
    TestValidator.predicate(
      "deleted customer has valid createdAt",
      deletedCustomer.createdAt !== null &&
        deletedCustomer.createdAt !== undefined,
    );
  }
  // Step 5: Test with pagination for large datasets
  const pagedDeleted = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        isDeleted: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(pagedDeleted);
  TestValidator.predicate(
    "paged results respect limit",
    pagedDeleted.data.length <= 10,
  );
  TestValidator.equals(
    "pagination current page is 1",
    pagedDeleted.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    pagedDeleted.pagination.limit <= 10,
  );
  // Step 6: Verify sorting is maintained within filtered results
  const sortedDeleted = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        isDeleted: true,
        sort: "created_at_desc",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(sortedDeleted);
  // Verify descending order by creation date (if more than one item)
  if (sortedDeleted.data.length > 1) {
    for (let i = 1; i < sortedDeleted.data.length; i++) {
      const prevDate = new Date(sortedDeleted.data[i - 1].createdAt).getTime();
      const currDate = new Date(sortedDeleted.data[i].createdAt).getTime();
      TestValidator.predicate(
        "sorted results maintain created_at_desc order",
        prevDate >= currDate,
      );
    }
  }
}
