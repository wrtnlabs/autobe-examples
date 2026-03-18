import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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

export async function test_api_employee_creation_with_department_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a department within the organization
  const department =
    await generate_random_hrm_platform_member_departments_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 3. Create a second member account to be added as employee
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMemberAuth = await authorize_member_join(
    employeeMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(employeeMemberAuth);
  // 4. Create employee record with department_id provided
  const employeeWithDepartment =
    await generate_random_hrm_platform_member_employees_create(
      ownerConnection,
      {
        body: {
          member_id: employeeMemberAuth.member.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          department_id: department.id,
          position: RandomGenerator.paragraph({ sentences: 1 }),
          employment_type: "full-time",
          status: "active",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(employeeWithDepartment);
  // 5. Verify response includes department relation with correct details
  TestValidator.equals(
    "employee department matches created department",
    employeeWithDepartment.department?.id,
    department.id,
  );
  TestValidator.equals(
    "employee department name matches",
    employeeWithDepartment.department?.name,
    department.name,
  );
  TestValidator.equals(
    "employee member id matches",
    employeeWithDepartment.member.id,
    employeeMemberAuth.member.id,
  );
  // 6. Create another member for testing employee without department
  const employeeWithoutDeptConnection: api.IConnection = {
    host: connection.host,
  };
  const employeeWithoutDeptAuth = await authorize_member_join(
    employeeWithoutDeptConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(employeeWithoutDeptAuth);
  // 7. Create employee record without department assignment (null department_id)
  const employeeWithoutDepartment =
    await generate_random_hrm_platform_member_employees_create(
      ownerConnection,
      {
        body: {
          member_id: employeeWithoutDeptAuth.member.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          department_id: null,
          position: RandomGenerator.paragraph({ sentences: 1 }),
          employment_type: "part-time",
          status: "active",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(employeeWithoutDepartment);
  // 8. Verify employee without department has null department
  TestValidator.equals(
    "employee without department has null department",
    employeeWithoutDepartment.department,
    null,
  );
  TestValidator.equals(
    "employee member id matches",
    employeeWithoutDepartment.member.id,
    employeeWithoutDeptAuth.member.id,
  );
}
