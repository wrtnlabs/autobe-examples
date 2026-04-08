import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_role_permission_retrieval_from_builtin_owner_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates organization (implicitly creates Owner role)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 2. Member joins the system
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuthorized);
  // 3. Set organization context for the member
  // Note: The organization ID should be obtained from the organization's creation
  // For this test, we use the organization context selection which validates
  // that the member has an active employee record in the target organization
  const orgContext =
    await api.functional.erpHrm.member.organization_context.select(
      memberConnection,
      {
        body: {
          organizationId: adminAuthorized.id, // Admin's user ID used as organization context
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(orgContext);
  // 4. Get the Owner role ID from the employee's role
  // The owner/creator of the organization has the Owner role
  const ownerRoleId = orgContext.employee.role.id;
  TestValidator.equals("role is Owner", orgContext.employee.role.name, "Owner");
  TestValidator.predicate(
    "role is builtin",
    orgContext.employee.role.isBuiltin === true,
  );
  // 5. Get a permission ID from the organization's permissions
  // The Owner role has 'org:manage' permission as its first permission
  const permissionId = orgContext.permissions[0];
  TestValidator.predicate("has permissions", orgContext.permissions.length > 0);
  // 6. Retrieve specific permission assignment from Owner role
  const rolePermission =
    await api.functional.erpHrm.member.roles.permissions.at(memberConnection, {
      roleId: ownerRoleId,
      permissionId: permissionId,
    });
  typia.assert(rolePermission);
  // 7. Validate response structure matches IErpHrmRolePermission
  TestValidator.equals(
    "permission id matches requested",
    rolePermission.id,
    permissionId,
  );
  TestValidator.predicate(
    "has valid permission code",
    /^org:/.test(rolePermission.permission),
  );
  TestValidator.equals(
    "role id matches requested",
    rolePermission.role.id,
    ownerRoleId,
  );
  TestValidator.equals("role name is Owner", rolePermission.role.name, "Owner");
  TestValidator.predicate(
    "role is builtin",
    rolePermission.role.isBuiltin === true,
  );
  TestValidator.predicate("has createdAt", !!rolePermission.createdAt);
  TestValidator.predicate("has updatedAt", !!rolePermission.updatedAt);
}
