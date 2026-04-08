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

export async function test_api_role_deletion_with_assigned_employees_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin with organization context
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IErpHrmAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {},
  );
  typia.assert(authorized);
  // Step 2: Create a custom role that will have an employee assigned
  const customRole: IErpHrmRole =
    await generate_random_erp_hrm_admin_roles_create(adminConnection, {
      body: {
        name: `Test Role ${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["employee:view", "project:view"],
      },
    });
  typia.assert(customRole);
  // Step 3: Create an employee assigned to the custom role
  const employeeInvitation: IErpHrmInvitation =
    await generate_random_erp_hrm_admin_employees_create(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: customRole.id,
        employmentType: "full-time",
      },
    });
  typia.assert(employeeInvitation);
  // Step 4: Attempt to delete the role (should fail with 409 Conflict)
  await TestValidator.error(
    "should reject role deletion with assigned employees",
    async () => {
      await api.functional.erpHrm.admin.roles.erase(adminConnection, {
        roleId: customRole.id,
      });
    },
  );
}