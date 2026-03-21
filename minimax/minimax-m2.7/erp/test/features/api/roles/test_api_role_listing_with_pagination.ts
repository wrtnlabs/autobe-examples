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

export async function test_api_role_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to access role listing endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve paginated list of all roles within the organization (no filters)
  const response = await api.functional.erpHrm.admin.roles.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmRole.IRequest,
    },
  );
  // 3. Validate response structure with typia.assert
  typia.assert(response);
  // 4. Validate built-in roles are present
  const roleNames = response.data.map((role) => role.name);
  TestValidator.equals("Owner role present", roleNames.includes("Owner"), true);
  TestValidator.equals(
    "Manager role present",
    roleNames.includes("Manager"),
    true,
  );
  TestValidator.equals(
    "Employee role present",
    roleNames.includes("Employee"),
    true,
  );
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
}
