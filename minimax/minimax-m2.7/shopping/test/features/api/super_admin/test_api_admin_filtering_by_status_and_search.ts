import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_filtering_by_status_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Get all admins to establish baseline
  const allAdmins = await api.functional.ecommerceMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {} satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(allAdmins);
  // 3. Test search functionality with partial matching
  const searchResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          search: "admin",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate search results contain matching email or name
  for (const admin of searchResult.data) {
    const emailMatch = admin.email.toLowerCase().includes("admin");
    const nameMatch = admin.name.toLowerCase().includes("admin");
    TestValidator.predicate(
      "admin matches search term",
      emailMatch || nameMatch,
    );
  }
  // 4. Test status filter "active" - only accounts with deleted_at=null
  const activeAdmins =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(activeAdmins);
  for (const admin of activeAdmins.data) {
    TestValidator.equals(
      "active admin has null deleted_at",
      admin.deleted_at,
      null,
    );
  }
  // 5. Test status filter "deleted" - only accounts with deleted_at IS NOT NULL
  const deletedAdmins =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "deleted",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(deletedAdmins);
  for (const admin of deletedAdmins.data) {
    TestValidator.predicate(
      "deleted admin has non-null deleted_at",
      admin.deleted_at !== null && admin.deleted_at !== undefined,
    );
  }
  // 6. Test pagination with page and limit parameters
  const paginatedResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination metadata present",
    paginatedResult.pagination !== undefined,
  );
  // Access pagination properties through type assertion since IPagination structure is unknown
  const pagination = paginatedResult.pagination as any;
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResult.data.length <= 2,
  );
}