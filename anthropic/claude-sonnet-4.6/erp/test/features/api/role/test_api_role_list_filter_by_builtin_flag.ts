import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_list_filter_by_builtin_flag(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization (authenticated member becomes owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  const organizationId = organization.id;
  // Step 3: Create a custom role with specific name and permissions
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: "HR Specialist",
          permissions: ["employee:view", "report:view"],
        },
        params: {
          organizationId,
        },
      },
    );
  typia.assert(customRole);
  // Step 4: Filter by is_builtin=true - should return only built-in roles (Owner, Manager, Employee)
  const builtinRolesPage =
    await api.functional.erpHrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: {
          is_builtin: true,
        } satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(builtinRolesPage);
  // Verify exactly 3 built-in roles
  TestValidator.equals(
    "builtin roles count",
    builtinRolesPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "builtin roles data length",
    builtinRolesPage.data.length,
    builtinRolesPage.pagination.records,
  );
  // Verify all returned roles have is_builtin=true
  for (const role of builtinRolesPage.data) {
    TestValidator.predicate("role is builtin", role.is_builtin === true);
  }
  // Verify built-in role names include the expected system roles
  const builtinNames = builtinRolesPage.data.map((r) => r.name);
  TestValidator.predicate("has Owner role", builtinNames.includes("Owner"));
  TestValidator.predicate("has Manager role", builtinNames.includes("Manager"));
  TestValidator.predicate(
    "has Employee role",
    builtinNames.includes("Employee"),
  );
  // Step 5: Filter by is_builtin=false - should return only custom roles
  const customRolesPage =
    await api.functional.erpHrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: {
          is_builtin: false,
        } satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(customRolesPage);
  // Verify exactly 1 custom role
  TestValidator.equals(
    "custom roles count",
    customRolesPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "custom roles data length",
    customRolesPage.data.length,
    customRolesPage.pagination.records,
  );
  // Verify all returned roles have is_builtin=false
  for (const role of customRolesPage.data) {
    TestValidator.predicate("role is not builtin", role.is_builtin === false);
  }
  // Verify the custom role name matches
  TestValidator.equals(
    "custom role name",
    customRolesPage.data[0]!.name,
    "HR Specialist",
  );
  // Step 6: Confirm mutual exclusivity - no role ID appears in both sets
  const builtinIds = new Set(builtinRolesPage.data.map((r) => r.id));
  const customIds = customRolesPage.data.map((r) => r.id);
  for (const id of customIds) {
    TestValidator.predicate(
      "custom role not in builtin set",
      !builtinIds.has(id),
    );
  }
  // Step 7: Verify pagination metadata consistency
  TestValidator.equals(
    "builtin pagination records matches data length",
    builtinRolesPage.pagination.records,
    builtinRolesPage.data.length,
  );
  TestValidator.equals(
    "custom pagination records matches data length",
    customRolesPage.pagination.records,
    customRolesPage.data.length,
  );
}
