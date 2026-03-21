import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_role_search_by_name_pattern(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get all roles first to establish baseline
  const allRolesResponse = await api.functional.erpHrm.admin.roles.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(allRolesResponse);
  TestValidator.equals("has data", allRolesResponse.data.length > 0, true);
  // 3. Test partial name search with "manage" (case-insensitive)
  const searchManageResponse = await api.functional.erpHrm.admin.roles.index(
    adminConnection,
    {
      body: {
        search: "manage",
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(searchManageResponse);
  // Validate that all returned roles contain "manage" (case-insensitive)
  for (const role of searchManageResponse.data) {
    TestValidator.predicate(
      `Role "${role.name}" should contain "manage"`,
      role.name.toLowerCase().includes("manage"),
    );
  }
  // 4. Test partial name search with uppercase "MANAGE"
  const searchUpperResponse = await api.functional.erpHrm.admin.roles.index(
    adminConnection,
    {
      body: {
        search: "MANAGE",
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(searchUpperResponse);
  // Results should be the same regardless of case
  TestValidator.equals(
    "case-insensitive search returns same count",
    searchManageResponse.data.length,
    searchUpperResponse.data.length,
  );
  // 5. Test search that matches multiple roles
  const searchEResponse = await api.functional.erpHrm.admin.roles.index(
    adminConnection,
    {
      body: {
        search: "e",
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(searchEResponse);
  // All returned roles should contain "e"
  for (const role of searchEResponse.data) {
    TestValidator.predicate(
      `Role "${role.name}" should contain "e"`,
      role.name.toLowerCase().includes("e"),
    );
  }
  // 6. Test search with pagination
  const paginatedResponse = await api.functional.erpHrm.admin.roles.index(
    adminConnection,
    {
      body: {
        search: "manage",
        page: 1,
        limit: 2,
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "limit respected",
    paginatedResponse.data.length <= 2,
    true,
  );
  TestValidator.equals("page is 1", paginatedResponse.pagination.current, 1);
  TestValidator.equals(
    "limit matches request",
    paginatedResponse.pagination.limit,
    2,
  );
  // Validate paginated results still contain search term
  for (const role of paginatedResponse.data) {
    TestValidator.predicate(
      `Paginated role "${role.name}" should contain "manage"`,
      role.name.toLowerCase().includes("manage"),
    );
  }
}
