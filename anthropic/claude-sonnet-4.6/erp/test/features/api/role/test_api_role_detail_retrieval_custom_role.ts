import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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

export async function test_api_role_detail_retrieval_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and create an actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new organization (the member becomes Owner with org:manage permission)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role within the organization with known permissions
  const permissionCodes = ["project:manage", "project:view", "time:view_all"];
  const roleName = "Project Coordinator";
  const createdRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: roleName,
          permissions: permissionCodes,
        },
      },
    );
  typia.assert(createdRole);
  // 4. Retrieve the custom role's full details
  const retrievedRole =
    await api.functional.erpHrm.member.organizations.roles.at(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: createdRole.id,
      },
    );
  typia.assert(retrievedRole);
  // 5. Validate the retrieved role matches the created role
  TestValidator.equals("role id matches", retrievedRole.id, createdRole.id);
  TestValidator.equals(
    "organizationId matches",
    retrievedRole.organizationId,
    organization.id,
  );
  TestValidator.equals("role name matches", retrievedRole.name, roleName);
  TestValidator.predicate(
    "isBuiltin is false",
    retrievedRole.isBuiltin === false,
  );
  TestValidator.equals(
    "permissions count matches",
    retrievedRole.permissions.length,
    permissionCodes.length,
  );
  // 6. Verify each permission entry has correct structure and permission codes match
  const retrievedCodes = retrievedRole.permissions
    .map((p) => p.permission_code)
    .sort();
  const expectedCodes = [...permissionCodes].sort();
  TestValidator.equals("permission codes match", retrievedCodes, expectedCodes);
  // 7. Verify nested role summary in each permission entry
  for (const permission of retrievedRole.permissions) {
    TestValidator.equals(
      "permission role id matches",
      permission.role.id,
      createdRole.id,
    );
    TestValidator.equals(
      "permission role name matches",
      permission.role.name,
      roleName,
    );
    TestValidator.predicate(
      "permission role is_builtin is false",
      permission.role.is_builtin === false,
    );
  }
}
