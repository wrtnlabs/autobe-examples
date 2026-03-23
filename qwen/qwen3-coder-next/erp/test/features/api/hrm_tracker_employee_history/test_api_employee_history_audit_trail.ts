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

export async function test_api_employee_history_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.hrmTracker.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Organization creation
  const orgConnection: api.IConnection = { host: connection.host };
  orgConnection.headers = { Authorization: member.token.access };
  const organization =
    await api.functional.hrmTracker.member.organizations.create(orgConnection, {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_uri: null,
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmTrackerOrganization.ICreate,
    });
  typia.assert(organization);
  // 3. Create employee record
  const employee = await api.functional.hrmTracker.member.employees.create(
    orgConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: "Junior Developer",
        department_id: null,
        role_id: null,
        organization_id: organization.id,
        user_id: member.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Update employee status to generate history entry
  await api.functional.hrmTracker.member.employees.update(orgConnection, {
    employeeId: employee.id,
    body: {
      status: "deactivated",
    } satisfies IHrmTrackerEmployee.IUpdate,
  });
  // 5. Reactivate employee to generate another history entry
  await api.functional.hrmTracker.member.employees.update(orgConnection, {
    employeeId: employee.id,
    body: {
      status: "active",
    } satisfies IHrmTrackerEmployee.IUpdate,
  });
  // 6. Update employee position to generate another history entry
  await api.functional.hrmTracker.member.employees.update(orgConnection, {
    employeeId: employee.id,
    body: {
      position: "Senior Developer",
    } satisfies IHrmTrackerEmployee.IUpdate,
  });
  // 7. Retrieve employee history
  const historyList = await api.functional.hrmTracker.employees.histories.at(
    orgConnection,
    { employeeId: employee.id },
  );
  typia.assert(historyList);
  // 8. Validate history entries
  TestValidator.equals(
    "history has employee data",
    historyList.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "history has organization data",
    historyList.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "history has changedBy member data",
    historyList.changedBy?.id,
    member.id,
  );
  TestValidator.predicate(
    "history has valid timestamp",
    new Date(historyList.created_at) <= new Date(),
  );
  TestValidator.equals(
    "current status is active",
    historyList.current_status,
    "active",
  );
  TestValidator.equals(
    "current position is Senior Developer",
    historyList.current_position,
    "Senior Developer",
  );
}
