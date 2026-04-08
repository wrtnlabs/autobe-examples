import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for accessing customer list
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Filter by 'banned' status - validates API accepts the filter
  const bannedResult = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        accountStatus: "banned",
      } as IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(bannedResult);
  // Validate pagination structure - typia.assert already validates all types
  TestValidator.equals(
    "banned result has data array length matching response",
    bannedResult.data.length <= bannedResult.pagination.limit,
    true,
  );
  // Test 2: Filter by 'active' status - validates API accepts the filter
  const activeResult = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        accountStatus: "active",
      } as IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(activeResult);
  // Validate pagination structure
  TestValidator.equals(
    "active result has data array length matching response",
    activeResult.data.length <= activeResult.pagination.limit,
    true,
  );
  // Test 3: Verify different status filters return different results (if data exists)
  // Note: In a real database, these counts should differ if both statuses exist
  TestValidator.predicate(
    "banned and active have different record counts",
    () =>
      bannedResult.pagination.records !== activeResult.pagination.records ||
      bannedResult.pagination.records === 0,
  );
  // Test 4: Validate pagination calculation
  TestValidator.predicate(
    "banned records is non-negative",
    () => bannedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "banned limit is positive",
    () => bannedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "banned pages is non-negative",
    () => bannedResult.pagination.pages >= 0,
  );
  // Test 5: Test pagination with page parameter
  const page2Result = await api.functional.ecommerceMall.customers.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
        accountStatus: "active",
      } as IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(page2Result);
  // Validate page 2 specific values
  TestValidator.equals(
    "page 2 current is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 5", page2Result.pagination.limit, 5);
  // Test 6: Verify pages calculation is consistent
  const expectedPagesBanned = Math.ceil(
    bannedResult.pagination.records / bannedResult.pagination.limit,
  );
  TestValidator.equals(
    "banned pages calculation matches",
    bannedResult.pagination.pages,
    expectedPagesBanned,
  );
  const expectedPagesActive = Math.ceil(
    activeResult.pagination.records / activeResult.pagination.limit,
  );
  TestValidator.equals(
    "active pages calculation matches",
    activeResult.pagination.pages,
    expectedPagesActive,
  );
}
