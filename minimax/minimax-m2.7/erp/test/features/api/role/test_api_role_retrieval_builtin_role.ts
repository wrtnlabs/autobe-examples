import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_role_retrieval_builtin_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Set organization context to establish working organization and get employee role
  const orgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      memberConnection,
      {},
    );
  // Get the role ID from the employee's role (could be Owner, Manager, or Employee)
  const roleId = orgContext.employee.role.id;
  // 3. Retrieve the role details
  const role = await api.functional.erpHrm.member.roles.at(memberConnection, {
    roleId: roleId,
  });
  typia.assert(role);
  // 4. Validate business logic: role ID matches request
  TestValidator.equals("role id matches request", role.id, roleId);
  // 5. Validate organization context matches
  TestValidator.equals(
    "organization id matches",
    role.organization.id,
    orgContext.organization.id,
  );
  // 6. Validate built-in role properties (business logic validation)
  TestValidator.equals("role is built-in", role.isBuiltin, true);
  TestValidator.equals(
    "deletedAt is null for active role",
    role.deletedAt,
    null,
  );
  // 7. Validate permissions exist (array length check - business logic)
  TestValidator.predicate(
    "role has permissions assigned",
    role.permissions.length > 0,
  );
}
