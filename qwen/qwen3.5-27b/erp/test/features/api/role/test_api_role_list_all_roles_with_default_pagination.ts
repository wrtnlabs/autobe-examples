import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving all roles in the organization with default pagination settings.
 * Verifies built-in roles (Owner, Manager, Employee) are present and pagination works correctly.
 */
export async function test_api_role_list_all_roles_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call role list endpoint with empty body (default pagination)
  const response = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array exists and is non-empty
  TestValidator.predicate("data array exists", response.data.length > 0);
  // 5. Verify built-in roles are present
  const builtInRoles = response.data.filter((role) => role.is_builtin === true);
  TestValidator.predicate(
    "at least 3 built-in roles exist",
    builtInRoles.length >= 3,
  );
  // 6. Verify built-in role types
  const builtInTypes = builtInRoles.map((role) => role.built_in_type);
  TestValidator.predicate("Owner role exists", builtInTypes.includes("owner"));
  TestValidator.predicate(
    "Manager role exists",
    builtInTypes.includes("manager"),
  );
  TestValidator.predicate(
    "Employee role exists",
    builtInTypes.includes("employee"),
  );
  // 7. Validate each role summary structure
  for (const role of response.data) {
    // Verify counts are non-negative
    TestValidator.predicate(
      `role ${role.name} employee_count >= 0`,
      role.employee_count >= 0,
    );
    TestValidator.predicate(
      `role ${role.name} permission_count >= 0`,
      role.permission_count >= 0,
    );
    // Verify organization is included
    TestValidator.predicate(
      `role ${role.name} has organization`,
      role.organization !== null && role.organization !== undefined,
    );
    TestValidator.predicate(
      `role ${role.name} organization has id`,
      typeof role.organization.id === "string",
    );
    TestValidator.predicate(
      `role ${role.name} organization has name`,
      typeof role.organization.name === "string",
    );
    // Verify built-in roles have built_in_type set
    if (role.is_builtin === true) {
      TestValidator.predicate(
        `role ${role.name} has built_in_type`,
        role.built_in_type !== null && role.built_in_type !== undefined,
      );
      const validTypes = ["owner", "manager", "employee"] as const;
      TestValidator.predicate(
        `role ${role.name} has valid built_in_type`,
        validTypes.includes(role.built_in_type as (typeof validTypes)[number]),
      );
    } else {
      // Custom roles should have built_in_type as null or undefined
      TestValidator.predicate(
        `role ${role.name} custom role has null built_in_type`,
        role.built_in_type === null || role.built_in_type === undefined,
      );
    }
  }
  // 8. Verify all roles belong to same organization
  const firstOrgId = response.data[0]?.organization.id;
  for (const role of response.data) {
    TestValidator.equals(
      `role ${role.name} belongs to same organization`,
      role.organization.id,
      firstOrgId,
    );
  }
}
