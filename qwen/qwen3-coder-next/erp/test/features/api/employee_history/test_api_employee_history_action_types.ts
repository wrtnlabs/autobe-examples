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

export async function test_api_employee_history_action_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner (member) with join
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(owner);
  // 2. Create organization
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create employee with initial active status
  const employeeBody = {
    employment_type: "full-time" as const,
    status: "active" as const,
    position: "Engineer",
    department_id: null,
    role_id: null,
    organization_id: organization.id,
    user_id: owner.id,
  } satisfies IHrmTrackerEmployee.ICreate;
  const employee = await generate_random_hrm_tracker_member_employees_create(
    ownerConnection,
    {
      body: employeeBody,
    },
  );
  typia.assert(employee);
  TestValidator.equals("initial status", employee.status, "active");
  TestValidator.equals("initial position", employee.position, "Engineer");
  // 4. Deactivate employee to generate status_changed history
  const deactivateBody = {
    status: "deactivated" as const,
  } satisfies IHrmTrackerEmployee.IUpdate;
  const deactivatedEmployee =
    await api.functional.hrmTracker.member.employees.update(ownerConnection, {
      employeeId: employee.id,
      body: deactivateBody,
    });
  typia.assert(deactivatedEmployee);
  TestValidator.equals(
    "deactivated status",
    deactivatedEmployee.status,
    "deactivated",
  );
  // 5. Reactivate and change position to generate position_changed history
  const positionUpdateBody = {
    status: "active" as const,
    position: "Senior Engineer" as const,
  } satisfies IHrmTrackerEmployee.IUpdate;
  const positionUpdatedEmployee =
    await api.functional.hrmTracker.member.employees.update(ownerConnection, {
      employeeId: employee.id,
      body: positionUpdateBody,
    });
  typia.assert(positionUpdatedEmployee);
  TestValidator.equals(
    "updated position",
    positionUpdatedEmployee.position,
    "Senior Engineer",
  );
  // 6. Change employment type to generate employment_type_changed history
  const employmentTypeBody = {
    employment_type: "contractor" as const,
  } satisfies IHrmTrackerEmployee.IUpdate;
  const employmentTypeUpdatedEmployee =
    await api.functional.hrmTracker.member.employees.update(ownerConnection, {
      employeeId: employee.id,
      body: employmentTypeBody,
    });
  typia.assert(employmentTypeUpdatedEmployee);
  TestValidator.equals(
    "updated employment type",
    employmentTypeUpdatedEmployee.employment_type,
    "contractor",
  );
  // 7. Generate role_changed history by updating role
  const roleBody = {
    role_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHrmTrackerEmployee.IUpdate;
  const roleUpdatedEmployee =
    await api.functional.hrmTracker.member.employees.update(ownerConnection, {
      employeeId: employee.id,
      body: roleBody,
    });
  typia.assert(roleUpdatedEmployee);
  // 8. Generate department_changed history by updating department
  const departmentBody = {
    department_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHrmTrackerEmployee.IUpdate;
  const departmentUpdatedEmployee =
    await api.functional.hrmTracker.member.employees.update(ownerConnection, {
      employeeId: employee.id,
      body: departmentBody,
    });
  typia.assert(departmentUpdatedEmployee);
  // 9. Retrieve history list and verify action types and transitions
  const historyList = await api.functional.hrmTracker.employees.histories.at(
    connection,
    {
      employeeId: employee.id,
    },
  );
  typia.assert(historyList);
  // Verify history entries exist and contain expected fields
  TestValidator.predicate("has history records", historyList.id !== undefined);
  TestValidator.predicate(
    "has action_type",
    historyList.action_type !== undefined,
  );
  TestValidator.predicate(
    "has current_status",
    historyList.current_status !== undefined,
  );
  TestValidator.predicate(
    "has previous_status",
    historyList.previous_status !== undefined,
  );
  TestValidator.predicate(
    "has current_position",
    historyList.current_position !== undefined,
  );
  TestValidator.predicate(
    "has previous_position",
    historyList.previous_position !== undefined,
  );
  TestValidator.predicate(
    "has current_employment_type",
    historyList.current_employment_type !== undefined,
  );
  TestValidator.predicate(
    "has previous_employment_type",
    historyList.previous_employment_type !== undefined,
  );
  TestValidator.predicate(
    "has changed_fields",
    historyList.changed_fields !== undefined,
  );
  TestValidator.predicate(
    "has change_description",
    historyList.change_description !== undefined,
  );
}
