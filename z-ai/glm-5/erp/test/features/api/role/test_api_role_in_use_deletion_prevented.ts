import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_in_use_deletion_prevented(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member and organization (member becomes owner with full permissions)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create a custom role within the organization
  const customRole = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: `Senior Developer ${RandomGenerator.alphabets(8)}`,
        permissions: [
          "employee:view",
          "project:view",
          "time:view_all",
          "report:view",
        ],
      },
    },
  );
  typia.assert(customRole);
  // Step 3: Create an employee and assign them to the custom role
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: employeeEmail,
        roleId: customRole.id,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(employee);
  // Verify the employee was assigned to the custom role
  TestValidator.equals(
    "employee assigned to custom role",
    employee.role.id,
    customRole.id,
  );
  // Step 4: Attempt to delete the role - should fail because employee is assigned
  await TestValidator.httpError(
    "role deletion prevented when employees are assigned",
    [400, 409],
    async () => {
      await api.functional.erpHrm.member.roles.erase(ownerConnection, {
        roleId: customRole.id,
      });
    },
  );
}
