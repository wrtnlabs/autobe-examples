import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
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
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_employee_profile_deactivated_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a custom role
  const role: IErpHrmRole = await generate_random_erp_hrm_roles_create(
    ownerConnection,
    {},
  );
  typia.assert(role);
  // 3. Create an active employee
  const employee: IErpHrmEmployee =
    await generate_random_erp_hrm_member_employees_create(ownerConnection, {
      body: {
        erp_hrm_role_id: role.id,
      },
    });
  typia.assert(employee);
  // 4. Capture baseline profile before deactivation
  const beforeDeactivation: IErpHrmEmployee =
    await api.functional.erpHrm.member.employees.at(ownerConnection, {
      employeeId: employee.id,
    });
  typia.assert(beforeDeactivation);
  // 5. Deactivate the employee
  const deactivated: IErpHrmEmployee =
    await api.functional.erpHrm.member.employees.deactivate(ownerConnection, {
      employeeId: employee.id,
    });
  typia.assert(deactivated);
  TestValidator.equals(
    "deactivate returns status deactivated",
    deactivated.status,
    "deactivated",
  );
  // 6. Retrieve deactivated employee profile
  const retrieved: IErpHrmEmployee =
    await api.functional.erpHrm.member.employees.at(ownerConnection, {
      employeeId: employee.id,
    });
  typia.assert(retrieved);
  // 7. Validate: status is "deactivated" in retrieved profile
  TestValidator.equals(
    "retrieved status should be deactivated",
    retrieved.status,
    "deactivated",
  );
  // 7.1 Member profile preserved
  TestValidator.equals(
    "member id preserved",
    retrieved.member.id,
    beforeDeactivation.member.id,
  );
  TestValidator.equals(
    "member email preserved",
    retrieved.member.email,
    beforeDeactivation.member.email,
  );
  TestValidator.equals(
    "member display_name preserved",
    retrieved.member.display_name,
    beforeDeactivation.member.display_name,
  );
  TestValidator.equals(
    "member avatar_image preserved",
    retrieved.member.avatar_image,
    beforeDeactivation.member.avatar_image,
  );
  TestValidator.equals(
    "member phone_number preserved",
    retrieved.member.phone_number,
    beforeDeactivation.member.phone_number,
  );
  // 7.2 Role assignment preserved
  TestValidator.equals(
    "role id preserved",
    retrieved.role.id,
    beforeDeactivation.role.id,
  );
  TestValidator.equals(
    "role name preserved",
    retrieved.role.name,
    beforeDeactivation.role.name,
  );
  // 7.3 Department preserved
  TestValidator.equals(
    "department preserved",
    retrieved.department,
    beforeDeactivation.department,
  );
  // 7.4 Position and employment_type preserved
  TestValidator.equals(
    "position preserved",
    retrieved.position,
    beforeDeactivation.position,
  );
  TestValidator.equals(
    "employment_type preserved",
    retrieved.employment_type,
    beforeDeactivation.employment_type,
  );
  // 7.5 ID preserved
  TestValidator.equals(
    "employee id preserved",
    retrieved.id,
    beforeDeactivation.id,
  );
  // 7.6 created_at preserved (immutable)
  TestValidator.equals(
    "created_at preserved",
    retrieved.created_at,
    beforeDeactivation.created_at,
  );
}
