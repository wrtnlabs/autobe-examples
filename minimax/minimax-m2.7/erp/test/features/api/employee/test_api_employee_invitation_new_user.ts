import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_employee_invitation_new_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via authorize_admin_join
  const adminAuthorization = await authorize_admin_join(connection, {});
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${adminAuthorization.token.access}`,
    },
  };
  // 2. Create a custom role with employee:manage permission for inviting employees
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Test Role ${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["employee:manage", "employee:view"] as (
          | "org:manage"
          | "employee:manage"
          | "employee:view"
          | "project:manage"
          | "project:view"
          | "time:manage"
          | "time:approve"
          | "time:view_all"
          | "report:view"
        )[],
      },
    },
  );
  typia.assert(customRole);
  // 3. Generate a non-existing email address for invitation
  const nonExistingEmail =
    `newuser${RandomGenerator.alphaNumeric(10)}@nonexistent-test.com` as string &
      tags.Format<"email">;
  // 4. Create employee invitation with non-existing email
  const invitation = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: nonExistingEmail,
        roleId: customRole.id,
        employmentType: "full-time",
        position: "Test Engineer",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(invitation);
  // 5. Validate invitation details
  TestValidator.equals(
    "invitation email matches",
    invitation.email,
    nonExistingEmail satisfies string as string,
  );
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  TestValidator.equals("role ID matches", invitation.role?.id, customRole.id);
  TestValidator.predicate(
    "token is generated",
    !!invitation.token && invitation.token.length > 0,
  );
  TestValidator.predicate(
    "expiration timestamp exists",
    !!invitation.expires_at,
  );
  TestValidator.predicate("organization is set", !!invitation.organization?.id);
}