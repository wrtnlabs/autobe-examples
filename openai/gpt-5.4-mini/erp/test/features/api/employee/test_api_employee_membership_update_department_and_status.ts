import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_hrm_time_tracking_member_departments_create";
import { generate_random_hrm_time_tracking_member_employees_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";

export async function test_api_employee_membership_update_department_and_status(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const organizationConnection: api.IConnection = { host: connection.host };
  organizationConnection.headers = {
    Authorization: authorized.token.access,
  };
  const firstDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      organizationConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(firstDepartment);
  const secondDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      organizationConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(secondDepartment);
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      organizationConnection,
      {
        body: {
          userAccountId: typia.random<string & tags.Format<"uuid">>(),
          roleId: typia.random<string & tags.Format<"uuid">>(),
          departmentId: firstDepartment.id,
          positionTitle: RandomGenerator.name(2),
          employmentType: "full-time",
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  TestValidator.equals(
    "initial department should match the created department",
    employee.department?.id,
    firstDepartment.id,
  );
  TestValidator.equals(
    "employee should belong to the active organization",
    employee.organization.id,
    firstDepartment.organization.id,
  );
  const originalPositionTitle = employee.positionTitle;
  const updatedEmploymentType =
    employee.employmentType === "full-time" ? "contractor" : "full-time";
  const updatedPositionTitle = `${RandomGenerator.name(2)} ${RandomGenerator.alphabets(4)}`;
  const updated =
    await api.functional.hrmTimeTracking.member.employees.putByEmployeeid(
      organizationConnection,
      {
        employeeId: employee.id,
        body: {
          department_id: secondDepartment.id,
          position_title: updatedPositionTitle,
          employment_type: updatedEmploymentType,
        } satisfies IHrmTimeTrackingEmployee.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "employee id should stay the same",
    updated.id,
    employee.id,
  );
  TestValidator.equals(
    "organization should be preserved",
    updated.organization.id,
    employee.organization.id,
  );
  TestValidator.equals(
    "role should be preserved",
    updated.role.id,
    employee.role.id,
  );
  TestValidator.equals(
    "department should change to the new department",
    updated.department?.id,
    secondDepartment.id,
  );
  TestValidator.notEquals(
    "position title should change",
    updated.positionTitle,
    originalPositionTitle,
  );
  TestValidator.equals(
    "employment type should update",
    updated.employmentType,
    updatedEmploymentType,
  );
  TestValidator.predicate(
    "linked user account should remain present",
    updated.userAccount !== null && updated.userAccount !== undefined,
  );
  const cleared =
    await api.functional.hrmTimeTracking.member.employees.putByEmployeeid(
      organizationConnection,
      {
        employeeId: employee.id,
        body: {
          department_id: null,
        } satisfies IHrmTimeTrackingEmployee.IUpdate,
      },
    );
  typia.assert(cleared);
  TestValidator.equals(
    "department should be cleared",
    cleared.department,
    null,
  );
  TestValidator.equals(
    "employee should remain in the same organization after clearing department",
    cleared.organization.id,
    employee.organization.id,
  );
  TestValidator.equals(
    "role should remain unchanged after clearing department",
    cleared.role.id,
    employee.role.id,
  );
  TestValidator.predicate(
    "linked user account should remain present after clearing department",
    cleared.userAccount !== null && cleared.userAccount !== undefined,
  );
}
