import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemSetting";
import type { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_pagination_sort(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection for system settings API
  const adminConnection: api.IConnection = { host: connection.host };
  // Get total records using first page with max limit for pagination testing
  const firstPage = await api.functional.redditCommunity.system_settings.index(
    adminConnection,
    { body: { limit: 100 } },
  );
  typia.assert(firstPage);
  const totalRecords = firstPage.pagination.records;
  // Test 1: Default pagination (no parameters)
  const defaultPage =
    await api.functional.redditCommunity.system_settings.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page number is 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default response has valid pagination",
    defaultPage.pagination.records >= 0,
  );
  // Test 2: Custom pageSize (50)
  const customPageSize =
    await api.functional.redditCommunity.system_settings.index(
      adminConnection,
      { body: { limit: 50 } },
    );
  typia.assert(customPageSize);
  TestValidator.equals(
    "custom limit is 50",
    customPageSize.pagination.limit,
    50,
  );
  // Test 3: Boundary values - minimum (1)
  const minPageSize =
    await api.functional.redditCommunity.system_settings.index(
      adminConnection,
      { body: { limit: 1 } },
    );
  typia.assert(minPageSize);
  TestValidator.equals("min limit is 1", minPageSize.pagination.limit, 1);
  // Test 4: Boundary values - maximum (100)
  const maxPageSize =
    await api.functional.redditCommunity.system_settings.index(
      adminConnection,
      { body: { limit: 100 } },
    );
  typia.assert(maxPageSize);
  TestValidator.equals("max limit is 100", maxPageSize.pagination.limit, 100);
  // Test 5: Page navigation - page 1
  const page1 = await api.functional.redditCommunity.system_settings.index(
    adminConnection,
    { body: { page: 1, limit: 10 } },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  // Test 6: Page navigation - page 2
  const page2 = await api.functional.redditCommunity.system_settings.index(
    adminConnection,
    { body: { page: 2, limit: 10 } },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.notEquals(
    "page 1 and 2 have different data",
    page1.data.map((d) => d.id),
    page2.data.map((d) => d.id),
  );
  // Test 7: Pages count calculation
  const pagesTest = await api.functional.redditCommunity.system_settings.index(
    adminConnection,
    { body: { limit: 10 } },
  );
  typia.assert(pagesTest);
  const expectedPagesCount = Math.ceil(totalRecords / 10);
  TestValidator.equals(
    "pages count is correct",
    pagesTest.pagination.pages,
    expectedPagesCount,
  );
  // Test 8: Sort by key ascending
  const keyAsc = await api.functional.redditCommunity.system_settings.index(
    adminConnection,
    { body: { sort: "key", sortOrder: "asc" } },
  );
  typia.assert(keyAsc);
  if (keyAsc.data.length > 1) {
    const isSortedAsc = keyAsc.data.every(
      (item, idx) =>
        idx === 0 || item.key.localeCompare(keyAsc.data[idx - 1].key) >= 0,
    );
    TestValidator.equals("key sort ascending order", isSortedAsc, true);
  }
  // Test 9: Sort by key descending
  const keyDesc = await api.functional.redditCommunity.system_settings.index(
    adminConnection,
    { body: { sort: "key", sortOrder: "desc" } },
  );
  typia.assert(keyDesc);
  if (keyDesc.data.length > 1) {
    const isSortedDesc = keyDesc.data.every(
      (item, idx) =>
        idx === 0 || item.key.localeCompare(keyDesc.data[idx - 1].key) <= 0,
    );
    TestValidator.equals("key sort descending order", isSortedDesc, true);
  }
  // Test 10: Sort by created_at ascending
  const createdAsc = await api.functional.redditCommunity.system_settings.index(
    adminConnection,
    { body: { sort: "created_at", sortOrder: "asc" } },
  );
  typia.assert(createdAsc);
  if (createdAsc.data.length > 1) {
    const isSortedAsc = createdAsc.data.every(
      (item, idx) =>
        idx === 0 ||
        item.created_at.localeCompare(createdAsc.data[idx - 1].created_at) >= 0,
    );
    TestValidator.equals("created_at sort ascending order", isSortedAsc, true);
  }
  // Test 11: Sort by created_at descending
  const createdDesc =
    await api.functional.redditCommunity.system_settings.index(
      adminConnection,
      { body: { sort: "created_at", sortOrder: "desc" } },
    );
  typia.assert(createdDesc);
  if (createdDesc.data.length > 1) {
    const isSortedDesc = createdDesc.data.every(
      (item, idx) =>
        idx === 0 ||
        item.created_at.localeCompare(createdDesc.data[idx - 1].created_at) <=
          0,
    );
    TestValidator.equals(
      "created_at sort descending order",
      isSortedDesc,
      true,
    );
  }
  // Test 12: Sort by updated_at ascending
  const updatedAsc = await api.functional.redditCommunity.system_settings.index(
    adminConnection,
    { body: { sort: "updated_at", sortOrder: "asc" } },
  );
  typia.assert(updatedAsc);
  if (updatedAsc.data.length > 1) {
    const isSortedAsc = updatedAsc.data.every(
      (item, idx) =>
        idx === 0 ||
        item.updated_at.localeCompare(updatedAsc.data[idx - 1].updated_at) >= 0,
    );
    TestValidator.equals("updated_at sort ascending order", isSortedAsc, true);
  }
  // Test 13: Sort by updated_at descending
  const updatedDesc =
    await api.functional.redditCommunity.system_settings.index(
      adminConnection,
      { body: { sort: "updated_at", sortOrder: "desc" } },
    );
  typia.assert(updatedDesc);
  if (updatedDesc.data.length > 1) {
    const isSortedDesc = updatedDesc.data.every(
      (item, idx) =>
        idx === 0 ||
        item.updated_at.localeCompare(updatedDesc.data[idx - 1].updated_at) <=
          0,
    );
    TestValidator.equals(
      "updated_at sort descending order",
      isSortedDesc,
      true,
    );
  }
  // Test 14: Pagination metadata accuracy
  const metadataTest =
    await api.functional.redditCommunity.system_settings.index(
      adminConnection,
      { body: { limit: 20 } },
    );
  typia.assert(metadataTest);
  TestValidator.equals(
    "metadata current page",
    metadataTest.pagination.current,
    1,
  );
  TestValidator.equals("metadata limit", metadataTest.pagination.limit, 20);
  TestValidator.predicate(
    "metadata records is non-negative",
    metadataTest.pagination.records >= 0,
  );
  const expectedPagesCount2 = Math.ceil(metadataTest.pagination.records / 20);
  TestValidator.equals(
    "metadata pages is correct",
    metadataTest.pagination.pages,
    expectedPagesCount2,
  );
  // Test 15: Pagination metadata - pages is 0 when no records
  if (metadataTest.pagination.records === 0) {
    TestValidator.equals(
      "pages is 0 when no records",
      metadataTest.pagination.pages,
      0,
    );
  }
}
