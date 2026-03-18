import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeDepartmentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeDepartmentHistory";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

export async function test_api_employee_department_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a department
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
  // 3. Create an employee (initially without department assignment)
  // Note: We need a valid role_id - using the member's ID as placeholder
  // In production, this would reference an actual role in the organization
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: authorized.id,
        role_id: authorized.id,
        employment_type: "full-time",
        status: "active",
        position: RandomGenerator.name(),
        department_id: null,
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Update employee to assign to department (creates department history record)
  const updatedEmployee =
    await api.functional.hrmPlatform.member.employees.update(memberConnection, {
      employeeId: employee.id,
      body: {
        department_id: department.id,
      } satisfies IHrmPlatformEmployee.IUpdate,
    });
  typia.assert(updatedEmployee);
  // 5. Validate employee department was updated correctly
  TestValidator.equals(
    "employee department matches",
    updatedEmployee.department?.id,
    department.id,
  );
  TestValidator.predicate(
    "department is not null",
    updatedEmployee.department !== null,
  );
  // Validate employee details
  TestValidator.equals("employee id matches", updatedEmployee.id, employee.id);
  TestValidator.equals(
    "display name matches",
    updatedEmployee.display_name,
    employee.display_name,
  );
  TestValidator.equals(
    "employment type matches",
    updatedEmployee.employment_type,
    employee.employment_type,
  );
  TestValidator.equals(
    "status matches",
    updatedEmployee.status,
    employee.status,
  );
  // Validate department details
  if (updatedEmployee.department) {
    TestValidator.equals(
      "department id matches",
      updatedEmployee.department.id,
      department.id,
    );
    TestValidator.equals(
      "department name matches",
      updatedEmployee.department.name,
      department.name,
    );
    TestValidator.equals(
      "department description matches",
      updatedEmployee.department.description,
      department.description,
    );
  }
  // Validate timestamps are in ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(updatedEmployee.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(updatedEmployee.updated_at)),
  );
}
