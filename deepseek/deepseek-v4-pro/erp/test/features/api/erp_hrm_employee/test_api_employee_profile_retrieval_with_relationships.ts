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
 * Test employee profile retrieval with complete relationship population.
 *
 * Validates that retrieving a newly created employee by ID returns the full
 * IErpHrmEmployee profile with all joined relationships correctly populated.
 * The test verifies that the member profile, assigned role, and optional
 * department are all resolved and nested within the response object.
 *
 * 1. Organization owner authenticates via member join.
 * 2. A custom role is created in the organization with random permissions.
 * 3. A second member is registered to serve as the invitee target.
 * 4. An employee is created by inviting the second member with position,
 *    employment type, and role assignment.
 * 5. The employee is retrieved by ID and all relational fields are validated.
 */
export async function test_api_employee_profile_retrieval_with_relationships(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Create a custom role in the organization
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Create a second member account (target for employee invitation)
  const inviteeConnection: api.IConnection = { host: connection.host };
  const invitee = await authorize_member_join(inviteeConnection, {});
  // 4. Create employee by inviting the second member into the organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: invitee.email,
        erp_hrm_role_id: role.id,
        employment_type: "full-time",
        position: "Software Engineer",
      },
    },
  );
  typia.assert(employee);
  // 5. Retrieve the employee by ID
  const retrieved = await api.functional.erpHrm.member.employees.at(
    ownerConnection,
    { employeeId: employee.id },
  );
  typia.assert(retrieved);
  // 6. Validate employee core fields
  TestValidator.equals("employee id matches", retrieved.id, employee.id);
  TestValidator.equals(
    "position matches",
    retrieved.position,
    "Software Engineer",
  );
  TestValidator.equals(
    "employment type matches",
    retrieved.employment_type,
    "full-time",
  );
  TestValidator.equals("status is active", retrieved.status, "active");
  // 7. Validate joined member profile
  TestValidator.equals("member id matches", retrieved.member.id, invitee.id);
  TestValidator.equals(
    "member email matches",
    retrieved.member.email,
    invitee.email,
  );
  TestValidator.equals(
    "member display_name matches",
    retrieved.member.display_name,
    invitee.display_name,
  );
  // 8. Validate joined role
  TestValidator.equals("role id matches", retrieved.role.id, role.id);
  TestValidator.equals("role name matches", retrieved.role.name, role.name);
  TestValidator.equals("role is not builtin", retrieved.role.is_builtin, false);
  // 9. Validate department is null (not assigned)
  TestValidator.equals(
    "department is null when not assigned",
    retrieved.department,
    null,
  );
}
