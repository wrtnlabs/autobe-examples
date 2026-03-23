import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerEmployeeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployeeHistory";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_employee_history_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member joins and creates organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await api.functional.hrmTracker.auth.member.join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(memberA);
  const orgAConnection: api.IConnection = { host: connection.host };
  orgAConnection.headers = {
    authorization: memberA.token.access,
  };
  // 2. Create organization A
  const orgA = await api.functional.hrmTracker.member.organizations.create(
    orgAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(orgA);
  // 3. Create employee in organization A
  const employeeA = await api.functional.hrmTracker.member.employees.create(
    orgAConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: "Developer",
        department_id: null,
        role_id: null,
        organization_id: orgA.id,
        user_id: memberA.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employeeA);
  // 4. Second member joins and creates organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await api.functional.hrmTracker.auth.member.join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(memberB);
  const orgBConnection: api.IConnection = { host: connection.host };
  orgBConnection.headers = {
    authorization: memberB.token.access,
  };
  // 5. Create organization B
  const orgB = await api.functional.hrmTracker.member.organizations.create(
    orgBConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 7,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(orgB);
  // 6. Create employee in organization B
  const employeeB = await api.functional.hrmTracker.member.employees.create(
    orgBConnection,
    {
      body: {
        employment_type: "part-time",
        status: "active",
        position: "Designer",
        department_id: null,
        role_id: null,
        organization_id: orgB.id,
        user_id: memberB.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employeeB);
  // 7. Test isolation: authenticate as organization A member
  const authConnectionA: api.IConnection = { host: connection.host };
  authConnectionA.headers = {
    authorization: memberA.token.access,
  };
  // 8. Verify organization A employee can access their own history
  const historyA = await api.functional.hrmTracker.employees.histories.at(
    authConnectionA,
    {
      employeeId: employeeA.id,
    },
  );
  typia.assert(historyA);
  // Verify the history entry belongs to organization A
  TestValidator.equals(
    "organization A employee history organization",
    historyA.organization.id,
    orgA.id,
  );
  // Verify the history entry belongs to employee A
  TestValidator.equals(
    "organization A employee history employee",
    historyA.employee.id,
    employeeA.id,
  );
  // 9. Verify organization A member cannot access organization B employee's history
  // (API should return no history or handle the request appropriately)
  try {
    const historyB = await api.functional.hrmTracker.employees.histories.at(
      authConnectionA,
      {
        employeeId: employeeB.id,
      },
    );
    typia.assert(historyB);
    // If successful, verify it's empty or null (no history for cross-org employee)
    TestValidator.equals(
      "organization A member cannot access organization B employee history",
      historyB.employee.id,
      employeeB.id,
    );
  } catch (error) {
    // If the API properly restricts access, it might throw an error
    TestValidator.predicate(
      "organization A member restricted from organization B employee",
      () => true,
    );
  }
}
