import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_list_include_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the include_deleted parameter for retrieving soft-deleted guest accounts.
   *
   * This test verifies that:
   * 1. When include_deleted is false or omitted, only active guests are returned
   * 2. When include_deleted is true, both active and soft-deleted guests are returned
   * 3. Response structure remains consistent regardless of include_deleted value
   * 4. Pagination works correctly in both scenarios
   */
  // Test 1: Retrieve guests WITHOUT include_deleted parameter (default behavior)
  const requestWithoutDeleted: IShoppingMallGuest.IRequest = {
    page: 1,
    limit: 20,
  };
  const resultWithoutDeleted = await api.functional.shoppingMall.guests.index(
    connection,
    {
      body: requestWithoutDeleted,
    },
  );
  typia.assert(resultWithoutDeleted);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists without include_deleted",
    resultWithoutDeleted.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists without include_deleted",
    Array.isArray(resultWithoutDeleted.data),
  );
  // Test 2: Retrieve guests WITH include_deleted=false (explicit)
  const requestExcludeDeleted: IShoppingMallGuest.IRequest = {
    page: 1,
    limit: 20,
    include_deleted: false,
  };
  const resultExcludeDeleted = await api.functional.shoppingMall.guests.index(
    connection,
    {
      body: requestExcludeDeleted,
    },
  );
  typia.assert(resultExcludeDeleted);
  // Validate that exclude_deleted=false returns same as default (no deleted guests)
  TestValidator.equals(
    "record count matches default behavior",
    resultExcludeDeleted.pagination.records,
    resultWithoutDeleted.pagination.records,
  );
  // Test 3: Retrieve guests WITH include_deleted=true
  const requestIncludeDeleted: IShoppingMallGuest.IRequest = {
    page: 1,
    limit: 20,
    include_deleted: true,
  };
  const resultIncludeDeleted = await api.functional.shoppingMall.guests.index(
    connection,
    {
      body: requestIncludeDeleted,
    },
  );
  typia.assert(resultIncludeDeleted);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists with include_deleted=true",
    resultIncludeDeleted.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists with include_deleted=true",
    Array.isArray(resultIncludeDeleted.data),
  );
  // Test 4: Verify that include_deleted=true returns >= records than exclude
  TestValidator.predicate(
    "include_deleted=true returns at least as many records",
    resultIncludeDeleted.pagination.records >=
      resultExcludeDeleted.pagination.records,
  );
  // Test 5: Validate response structure consistency
  // All guests should have required fields
  for (const guest of resultIncludeDeleted.data) {
    TestValidator.predicate(
      `guest ${guest.id} has valid UUID`,
      typeof guest.id === "string" && guest.id.length > 0,
    );
    TestValidator.predicate(
      `guest ${guest.id} has device_fingerprint`,
      typeof guest.device_fingerprint === "string",
    );
    TestValidator.predicate(
      `guest ${guest.id} has IP address`,
      typeof guest.ip === "string",
    );
    TestValidator.predicate(
      `guest ${guest.id} has created_at`,
      typeof guest.created_at === "string",
    );
    TestValidator.predicate(
      `guest ${guest.id} has updated_at`,
      typeof guest.updated_at === "string",
    );
    TestValidator.predicate(
      `guest ${guest.id} has active_session_count`,
      typeof guest.active_session_count === "number" &&
        guest.active_session_count >= 0,
    );
  }
  // Test 6: Test pagination with include_deleted=true
  const requestPaginated: IShoppingMallGuest.IRequest = {
    page: 1,
    limit: 10,
    include_deleted: true,
  };
  const resultPaginated = await api.functional.shoppingMall.guests.index(
    connection,
    {
      body: requestPaginated,
    },
  );
  typia.assert(resultPaginated);
  TestValidator.equals(
    "pagination limit matches request",
    resultPaginated.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    resultPaginated.pagination.current === 1,
  );
  TestValidator.predicate(
    "data length matches limit or total records",
    resultPaginated.data.length <= 10,
  );
}
