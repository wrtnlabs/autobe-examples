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

export async function test_api_administrator_list_role_grade_filter(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Test filtering by role_grade and deleted_at_status
  // Filter by role_grade=super
  const superAdminsResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        role_grade: "super" as const,
        deleted_at_status: "all" as const,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(superAdminsResponse);
  // Filter by role_grade=regular
  const regularAdminsResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        role_grade: "regular" as const,
        deleted_at_status: "all" as const,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(regularAdminsResponse);
  // Filter by deleted_at_status=deleted
  const deletedAdminsResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "deleted" as const,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(deletedAdminsResponse);
  // Filter by deleted_at_status=active
  const activeAdminsResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        deleted_at_status: "active" as const,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(activeAdminsResponse);
  // Combined filter - role_grade=regular AND deleted_at_status=active
  const regularActiveAdminsResponse =
    await api.functional.shoppingMall.admins.index(adminConnection, {
      body: {
        role_grade: "regular" as const,
        deleted_at_status: "active" as const,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(regularActiveAdminsResponse);
  // Combined filter - role_grade=super AND deleted_at_status=active
  const superActiveAdminsResponse =
    await api.functional.shoppingMall.admins.index(adminConnection, {
      body: {
        role_grade: "super" as const,
        deleted_at_status: "active" as const,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(superActiveAdminsResponse);
  // Filter with no matching results
  const noResultsResponse = await api.functional.shoppingMall.admins.index(
    adminConnection,
    {
      body: {
        role_grade: "super" as const,
        deleted_at_status: "deleted" as const,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(noResultsResponse);
}
