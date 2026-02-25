import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_administrator_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection for testing
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Setup: Create test data by creating administrators through available endpoints
  // Since we don't have direct creation endpoints, we'll test the list endpoint with various filters
  // and assume there's at least one administrator present in the system
  // Test 1: Basic list with default pagination
  const defaultList = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        deleted_at_status: "all",
      },
    },
  );
  typia.assert(defaultList);
  TestValidator.equals("default page is 1", defaultList.pagination.current, 1);
  TestValidator.equals("default limit is 20", defaultList.pagination.limit, 20);
  TestValidator.predicate("has records", defaultList.pagination.records >= 0);
  TestValidator.equals(
    "data count matches pagination",
    defaultList.data.length,
    defaultList.pagination.records,
  );
  // Test 2: Filter by role_grade - super administrators
  const superAdminList = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        role_grade: "super",
        deleted_at_status: "all",
      },
    },
  );
  typia.assert(superAdminList);
  // Test 3: Filter by role_grade - regular administrators
  const regularAdminList = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        role_grade: "regular",
        deleted_at_status: "all",
      },
    },
  );
  typia.assert(regularAdminList);
  // Test 4: Filter by deleted_at_status - active
  const activeAdminList = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        deleted_at_status: "active",
      },
    },
  );
  typia.assert(activeAdminList);
  // Test 5: Filter by deleted_at_status - deleted
  const deletedAdminList = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        deleted_at_status: "deleted",
      },
    },
  );
  typia.assert(deletedAdminList);
  // Test 6: Pagination - first page
  const firstPage = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        page: 1,
        limit: 2,
        deleted_at_status: "all",
      },
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  if (firstPage.data.length > 0) {
    TestValidator.equals("first page data count", firstPage.data.length, 2);
  }
  // Test 7: Pagination - second page
  const secondPage = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        page: 2,
        limit: 2,
        deleted_at_status: "all",
      },
    },
  );
  typia.assert(secondPage);
  TestValidator.equals("second page number", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  // Test 8: Sort by created_at ascending
  const sortedAsc = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        deleted_at_status: "all",
      },
    },
  );
  typia.assert(sortedAsc);
  // Test 9: Sort by created_at descending
  const sortedDesc = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        deleted_at_status: "all",
      },
    },
  );
  typia.assert(sortedDesc);
  // Test 10: Date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeList = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        created_at_from: yesterday,
        created_at_to: tomorrow,
        deleted_at_status: "all",
      },
    },
  );
  typia.assert(dateRangeList);
  // Test 11: Empty result set validation
  const farFuture = new Date(2099, 0, 1).toISOString();
  const farPast = new Date(2000, 0, 1).toISOString();
  const emptyList = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        created_at_from: farFuture,
        created_at_to: farFuture,
        deleted_at_status: "all",
      },
    },
  );
  typia.assert(emptyList);
  TestValidator.equals("empty result count", emptyList.pagination.records, 0);
  TestValidator.equals("empty data array", emptyList.data.length, 0);
  // Test 12: Validate response structure
  const response = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        deleted_at_status: "all",
      },
    },
  );
  typia.assert(response);
  // Validate pagination structure
  typia.assert<IPage.IPagination>(response.pagination);
  TestValidator.predicate(
    "pagination has current",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    response.pagination.pages >= 0,
  );
  // Validate admin summary structure
  if (response.data.length > 0) {
    const admin = response.data[0];
    typia.assert<IShoppingMallAdmin.ISummary>(admin);
    TestValidator.equals("admin has id", typeof admin.id, "string");
    TestValidator.equals("admin has user", admin.user !== undefined, true);
    TestValidator.equals("admin has reason", typeof admin.reason, "string");
    TestValidator.equals(
      "admin has status",
      ["pending", "approved", "rejected"].includes(admin.status),
      true,
    );
    TestValidator.equals(
      "admin has created_at",
      typeof admin.created_at,
      "string",
    );
    TestValidator.equals(
      "admin has updated_at",
      typeof admin.updated_at,
      "string",
    );
    // Validate user summary structure
    if (admin.user) {
      TestValidator.equals("user has id", typeof admin.user.id, "string");
      TestValidator.equals("user has email", typeof admin.user.email, "string");
    }
  }
  // Test 13: Maximum limit validation
  const maxLimitList = await api.functional.shoppingMall.admins.index(
    superAdminConnection,
    {
      body: {
        limit: 100,
        deleted_at_status: "all",
      },
    },
  );
  typia.assert(maxLimitList);
  TestValidator.equals(
    "max limit respected",
    maxLimitList.pagination.limit,
    100,
  );
}