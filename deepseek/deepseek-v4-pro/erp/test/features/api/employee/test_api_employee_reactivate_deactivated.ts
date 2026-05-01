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
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_employee_reactivate_deactivated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare invitee email for controlled matching
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  // 2. Owner signs up — creates organization and receives Owner role
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 3. Invitee creates a member account (no organization yet)
  const inviteeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(inviteeConnection, {
    body: { email: inviteeEmail },
  });
  // 4. Owner invites the existing member → immediate employee creation
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    { body: { email: inviteeEmail } },
  );
  typia.assert(employee);
  // 5. Owner deactivates the employee
  const deactivated = await api.functional.erpHrm.member.employees.deactivate(
    ownerConnection,
    { employeeId: employee.id },
  );
  typia.assert(deactivated);
  TestValidator.equals("deactivated status", deactivated.status, "deactivated");
  // 6. Owner reactivates the employee
  const reactivated = await api.functional.erpHrm.member.employees.reactivate(
    ownerConnection,
    { employeeId: employee.id },
  );
  typia.assert(reactivated);
  // 7. Validate reactivation: status restored, all fields preserved
  TestValidator.equals(
    "reactivated status is active",
    reactivated.status,
    "active",
  );
  TestValidator.equals("employee id preserved", reactivated.id, employee.id);
  TestValidator.equals(
    "role id preserved",
    reactivated.role.id,
    employee.role.id,
  );
  TestValidator.equals(
    "role name preserved",
    reactivated.role.name,
    employee.role.name,
  );
  TestValidator.equals(
    "position preserved",
    reactivated.position,
    employee.position,
  );
  TestValidator.equals(
    "employment type preserved",
    reactivated.employment_type,
    employee.employment_type,
  );
  TestValidator.equals(
    "department preserved",
    reactivated.department,
    employee.department,
  );
  TestValidator.equals(
    "member id preserved",
    reactivated.member.id,
    employee.member.id,
  );
  TestValidator.equals(
    "member email preserved",
    reactivated.member.email,
    employee.member.email,
  );
  TestValidator.equals(
    "member display name preserved",
    reactivated.member.display_name,
    employee.member.display_name,
  );
}
