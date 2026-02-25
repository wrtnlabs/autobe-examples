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

export async function test_api_administrator_list_date_range_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection using base connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Test with default parameters (no filters, no sorting)
  const defaultResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "all",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // 2. Test pagination boundaries (page=1, limit=5)
  const paginationResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "all",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination limit applies",
    paginationResponse.data.length,
    5,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit value",
    paginationResponse.pagination.limit,
    5,
  );
  // 3. Test sorting by created_at descending
  const createdAtDescResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "all",
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(createdAtDescResponse);
  // 4. Test sorting by created_at ascending
  const createdAtAscResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "all",
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(createdAtAscResponse);
  // 5. Test sorting by updated_at descending
  const updatedAtDescResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "all",
        sort_by: "updated_at",
        sort_order: "desc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(updatedAtDescResponse);
  // 6. Test sorting by role_grade descending
  const roleGradeDescResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "all",
        sort_by: "role_grade",
        sort_order: "desc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(roleGradeDescResponse);
  // 7. Test role_grade filtering with "regular" value
  const regularAdminsResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "all",
        role_grade: "regular",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(regularAdminsResponse);
  // 8. Test role_grade filtering with "super" value
  const superAdminsResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "all",
        role_grade: "super",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(superAdminsResponse);
  // 9. Test created_at_from date range filter
  const fromResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "all",
        created_at_from: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(fromResponse);
  // 10. Test created_at_to date range filter
  const toResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "all",
        created_at_to: new Date().toISOString(), // current time
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(toResponse);
  // 11. Test combined filters (date range + sorting)
  const combinedResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "all",
        created_at_from: new Date(Date.now() - 86400000).toISOString(),
        created_at_to: new Date().toISOString(),
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(combinedResponse);
}
