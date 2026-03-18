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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_role_list_default_builtin_roles(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization using the authenticated member connection
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Call the roles index endpoint with empty filters (default pagination)
  const rolesPage =
    await api.functional.erpHrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {} satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(rolesPage);
  // Step 5: Verify pagination.records is at least 3
  TestValidator.predicate(
    "pagination records should be at least 3 (built-in roles)",
    rolesPage.pagination.records >= 3,
  );
  // Step 6: Verify the data array is non-empty
  TestValidator.predicate(
    "data array should not be empty",
    rolesPage.data.length > 0,
  );
  // Step 7: Verify all returned roles have is_builtin=true (no custom roles yet)
  const allBuiltin = rolesPage.data.every((role) => role.is_builtin === true);
  TestValidator.predicate(
    "all roles should be built-in (no custom roles yet)",
    allBuiltin,
  );
  // Step 6 continued: Verify exactly three built-in roles exist
  const builtinRoles = rolesPage.data.filter(
    (role) => role.is_builtin === true,
  );
  TestValidator.predicate(
    "exactly three built-in roles should exist",
    builtinRoles.length === 3,
  );
  // Verify the three built-in role names are Owner, Manager, Employee
  const builtinNames = builtinRoles.map((role) => role.name).sort();
  const expectedNames = ["Employee", "Manager", "Owner"].sort();
  TestValidator.equals(
    "built-in role names should be Owner, Manager, Employee",
    builtinNames,
    expectedNames,
  );
}
