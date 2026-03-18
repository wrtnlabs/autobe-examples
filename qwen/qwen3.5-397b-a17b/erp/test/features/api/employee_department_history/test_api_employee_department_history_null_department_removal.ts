import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeDepartmentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeDepartmentHistory";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeeDepartmentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeDepartmentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

export async function test_api_employee_department_history_null_department_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a test department
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(department);
  // 3. Create a second member to be the employee
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMemberAuth = await authorize_member_join(
    employeeMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(employeeMemberAuth);
  // 4. Create employee record and assign to department
  // Note: The utility's prepare function handles role_id internally
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: employeeMemberAuth.id,
        department_id: department.id,
        employment_type: "full-time",
        position: RandomGenerator.name(),
      },
    },
  );
  typia.assert(employee);
  // 5. Verify employee is assigned to department
  TestValidator.equals(
    "employee department matches",
    employee.department?.id,
    department.id,
  );
  // 6. Remove employee from department by updating with null department_id
  const updatedEmployee =
    await api.functional.hrmPlatform.member.employees.update(memberConnection, {
      employeeId: employee.id,
      body: {
        department_id: null,
      } satisfies IHrmPlatformEmployee.IUpdate,
    });
  typia.assert(updatedEmployee);
  // 7. Verify employee no longer has department
  TestValidator.equals(
    "employee department is null",
    updatedEmployee.department,
    null,
  );
  // 8. Query history endpoint with department_id filter set to null to get removal records
  const removalHistory =
    await api.functional.hrmPlatform.member.employee_department_histories.index(
      memberConnection,
      {
        body: {
          department_id: null,
          employee_id: employee.id,
        } satisfies IHrmPlatformEmployeeDepartmentHistory.IRequest,
      },
    );
  typia.assert(removalHistory);
  // 9. Verify removal history record exists
  TestValidator.predicate(
    "removal history has records",
    removalHistory.data.length > 0,
  );
  // 10. Find the removal record (department should be null)
  const removalRecord = removalHistory.data.find(
    (record) => record.department === null,
  );
  TestValidator.predicate("removal record exists", removalRecord !== undefined);
  if (removalRecord) {
    // 11. Verify removal record structure
    TestValidator.equals(
      "removal employee matches",
      removalRecord.employee.id,
      employee.id,
    );
    TestValidator.equals(
      "removal department is null",
      removalRecord.department,
      null,
    );
    TestValidator.equals(
      "removal changedBy matches member",
      removalRecord.changedBy.id,
      memberAuth.member.id,
    );
    TestValidator.predicate(
      "removal changed_at is valid date",
      new Date(removalRecord.changed_at) instanceof Date,
    );
    TestValidator.predicate(
      "removal created_at is valid date",
      new Date(removalRecord.created_at) instanceof Date,
    );
  }
  // 12. Query history by employee_id to get all history (assignment + removal)
  const allHistory =
    await api.functional.hrmPlatform.member.employee_department_histories.index(
      memberConnection,
      {
        body: {
          employee_id: employee.id,
        } satisfies IHrmPlatformEmployeeDepartmentHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  // 13. Verify all history includes both assignment and removal records
  TestValidator.predicate(
    "all history has assignment and removal",
    allHistory.data.length >= 2,
  );
  // 14. Verify at least one record has department (assignment) and one has null (removal)
  const hasAssignment = allHistory.data.some(
    (record) => record.department !== null,
  );
  const hasRemoval = allHistory.data.some(
    (record) => record.department === null,
  );
  TestValidator.predicate("has assignment record", hasAssignment);
  TestValidator.predicate("has removal record", hasRemoval);
}
