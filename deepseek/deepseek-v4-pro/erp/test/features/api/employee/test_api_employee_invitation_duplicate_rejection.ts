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
 * Test that inviting the same member to an organization twice is rejected with 409 Conflict.
 *
 * Validates the duplicate invitation prevention mechanism in the employee onboarding flow. When an organization owner attempts to invite a member who is already an employee of the organization, the system must detect the unique constraint violation on member_id + organization_id and return a 409 Conflict response instead of creating a duplicate employee record or additional invitation.
 *
 * 1. Organization Owner registers and authenticates via member join.
 * 2. Owner creates a custom role for the incoming employee.
 * 3. A second member registers independently with a different email.
 * 4. Owner invites the second member by email — the member exists so the employee record is created immediately.
 * 5. Owner attempts to invite the same email again — the system detects the duplicate and returns 409 Conflict.
 * 6. Validates that the original employee record is correctly formed and the role assignment matches.
 */
export async function test_api_employee_invitation_duplicate_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner signs up (auto-creates organization)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a custom role for the invited employee
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Second member signs up with a different email
  const memberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(memberConnection, {});
  typia.assert(secondMember);
  // 4. First invitation — succeeds because the member exists
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: secondMember.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  TestValidator.equals(
    "invited email matches",
    employee.member.email,
    secondMember.email,
  );
  TestValidator.equals("assigned role matches", employee.role.id, role.id);
  // 5. Duplicate invitation — must be rejected with 409 Conflict
  await TestValidator.error("duplicate invitation rejected", async () => {
    await api.functional.erpHrm.member.employees.create(ownerConnection, {
      body: {
        email: secondMember.email,
        erp_hrm_role_id: role.id,
        employment_type: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    });
  });
}
