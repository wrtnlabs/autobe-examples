import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_role_custom_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the system
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create organization (member becomes Owner automatically)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role with specific permissions
  const roleName = "Senior Developer";
  const roleDescription =
    "Custom role for senior team members with project management capabilities";
  const createdRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: roleName,
        description: roleDescription,
        permissions: [
          { permission: "employee.view" },
          { permission: "project.manage" },
          { permission: "timesheet.approve" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(createdRole);
  // 4. Retrieve the role by its unique identifier
  const retrievedRole = await api.functional.erpHrm.member.roles.at(
    memberConnection,
    { roleId: createdRole.id },
  );
  typia.assert(retrievedRole);
  // 5. Validate all expected properties
  TestValidator.equals("role ID matches", retrievedRole.id, createdRole.id);
  TestValidator.equals("role name matches", retrievedRole.name, roleName);
  TestValidator.equals(
    "role description matches",
    retrievedRole.description,
    roleDescription,
  );
  TestValidator.equals(
    "organization ID matches",
    retrievedRole.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "isBuiltin is false for custom role",
    retrievedRole.isBuiltin === false,
  );
  TestValidator.predicate(
    "deletedAt is null for active role",
    retrievedRole.deletedAt === null,
  );
}
