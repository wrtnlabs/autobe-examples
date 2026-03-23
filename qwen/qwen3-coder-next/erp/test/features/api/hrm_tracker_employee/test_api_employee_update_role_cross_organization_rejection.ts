import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";

export async function test_api_employee_update_role_cross_organization_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 2. Login as admin to get admin authentication
  const adminAuth = await api.functional.hrmTracker.auth.member.login(
    adminConnection,
    {
      body: {
        email: adminMember.email,
        password: "12345678", // Using same password as join
        href: "http://localhost:3000/",
        referrer: "http://localhost:3000/",
      } satisfies IHrmTrackerMember.ILogin,
    },
  );
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 3. Create organization for manager and employee (Org A)
  const orgA = typia.random<IHrmTrackerOrganization.ISummary>();
  // 4. Create manager (user M) in Org A
  const managerMemberInfo = typia.random<IHrmTrackerMember.ISummary>();
  const managerEmployee =
    await generate_random_hrm_tracker_member_employees_create(adminConnection, {
      body: {
        organization_id: orgA.id,
        user_id: managerMemberInfo.id,
        employment_type: "full-time",
        status: "active",
        position: "Manager",
        department_id: null,
        role_id: null,
      } satisfies IHrmTrackerEmployee.ICreate,
    });
  // 5. Create employee (user E) in Org A
  const employeeMemberInfo = typia.random<IHrmTrackerMember.ISummary>();
  const employeeEmployee =
    await generate_random_hrm_tracker_member_employees_create(adminConnection, {
      body: {
        organization_id: orgA.id,
        user_id: employeeMemberInfo.id,
        employment_type: "full-time",
        status: "active",
        position: "Employee",
        department_id: null,
        role_id: null,
      } satisfies IHrmTrackerEmployee.ICreate,
    });
  // 6. Create role (role X) that belongs to different organization (simulated with different org ID)
  const roleX = typia.random<string & tags.Format<"uuid">>();
  // 7. Create manager-specific connection with admin token
  const managerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 8. Attempt to update employee's role to role from different organization
  await TestValidator.error("cross-org role update rejected", async () => {
    await api.functional.hrmTracker.member.employees.update(managerConnection, {
      employeeId: employeeEmployee.id,
      body: {
        role_id: roleX,
      } satisfies IHrmTrackerEmployee.IUpdate,
    });
  });
  // 9. Validate employee's role remains unchanged (null in this case)
  const updatedEmployee =
    await api.functional.hrmTracker.member.employees.update(managerConnection, {
      employeeId: employeeEmployee.id,
      body: {
        status: "active",
      } satisfies IHrmTrackerEmployee.IUpdate,
    });
  typia.assert(updatedEmployee);
  // Verify role_id is still null as initially set
  TestValidator.equals("role unchanged", updatedEmployee.role_id, null);
  // Verify organization is still the same
  TestValidator.equals(
    "organization unchanged",
    updatedEmployee.organization_id,
    orgA.id,
  );
}
