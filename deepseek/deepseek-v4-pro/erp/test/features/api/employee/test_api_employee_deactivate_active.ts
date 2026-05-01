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

/**
 * Test employee deactivation by an Owner, verifying status transition and data preservation.
 *
 * Validates that a member holding the Owner role (which includes the `employee:manage` permission) can successfully deactivate an active employee within their organization. The test verifies the complete flow: Owner authentication, second member creation for the employee identity, custom role assignment, employee creation with active status, and the deactivation endpoint call.
 *
 * Special attention is given to confirming that deactivation is a targeted status change — only the `status` field transitions from `active` to `deactivated`, while all employee identity fields (id, member email, assigned role) are preserved without modification. This ensures deactivation suspends the employee's ability to log time and submit timesheets without destroying their historical record.
 *
 * 1. Owner joins, creating an organization and obtaining Owner credentials (employee:manage permission).
 * 2. A second member joins to establish a user account whose email can be used for the employee invitation.
 * 3. Owner creates a custom role to assign to the prospective employee.
 * 4. Owner invites the second member as an employee with the custom role — the email match creates an immediate active employee.
 * 5. Owner calls the deactivate endpoint on the newly created employee.
 * 6. Validates that status is deactivated while id, role, and member email remain unchanged.
 */
export async function test_api_employee_deactivate_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Create another member whose email will be used for the employee
  const otherConnection: api.IConnection = { host: connection.host };
  const other = await authorize_member_join(otherConnection, {});
  // 3. Create a custom role within the owner's organization
  const customRole = await generate_random_erp_hrm_roles_create(
    ownerConnection,
    {},
  );
  // 4. Create an employee using the other member's email (creates active employee)
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: other.email,
        erp_hrm_role_id: customRole.id,
      },
    },
  );
  typia.assert(employee);
  TestValidator.equals("employee initially active", employee.status, "active");
  // 5. Deactivate the employee
  const deactivated = await api.functional.erpHrm.member.employees.deactivate(
    ownerConnection,
    { employeeId: employee.id },
  );
  typia.assert(deactivated);
  // 6. Validate deactivation and data preservation
  TestValidator.equals(
    "status is deactivated",
    deactivated.status,
    "deactivated",
  );
  TestValidator.equals("employee id preserved", deactivated.id, employee.id);
  TestValidator.equals("role preserved", deactivated.role.id, customRole.id);
  TestValidator.equals(
    "member email preserved",
    deactivated.member.email,
    other.email,
  );
}
