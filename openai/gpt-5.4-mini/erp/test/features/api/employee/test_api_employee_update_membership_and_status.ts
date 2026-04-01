import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";

export async function test_api_employee_update_membership_and_status(
  connection: api.IConnection,
): Promise<void> {
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const department =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(department);
  const role = await generate_random_erp_hrm_time_member_roles_create(
    memberConnection,
    {
      body: {
        name: `role-${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeRole.ICreate,
    },
  );
  typia.assert(role);
  const employee = await api.functional.erpHrmTime.member.employees.at(
    memberConnection,
    {
      employeeId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(employee);
  const originalOrganization = employee.organization;
  const originalMember = employee.member;
  const mutableEmploymentType = RandomGenerator.pick([
    "full-time",
    "part-time",
    "contractor",
    "intern",
  ] as const);
  const mutablePositionTitle = RandomGenerator.name();
  const deactivated = await api.functional.erpHrmTime.member.employees.update(
    memberConnection,
    {
      employeeId: employee.id,
      body: {
        erpHrmTimeDepartmentId: department.id,
        erpHrmTimeRoleId: role.id,
        positionTitle: mutablePositionTitle,
        employmentType: mutableEmploymentType,
        status: "deactivated",
      } satisfies IErpHrmTimeEmployee.IUpdate,
    },
  );
  typia.assert(deactivated);
  TestValidator.equals(
    "employee organization remains unchanged",
    deactivated.organization,
    originalOrganization,
  );
  TestValidator.equals(
    "employee member remains unchanged",
    deactivated.member,
    originalMember,
  );
  TestValidator.equals(
    "department assigned within organization",
    deactivated.department?.id,
    department.id,
  );
  TestValidator.equals(
    "role assigned within organization",
    deactivated.role.id,
    role.id,
  );
  TestValidator.equals(
    "status changed to deactivated",
    deactivated.status,
    "deactivated",
  );
  TestValidator.equals(
    "position title updated",
    deactivated.positionTitle,
    mutablePositionTitle,
  );
  TestValidator.equals(
    "employment type updated",
    deactivated.employmentType,
    mutableEmploymentType,
  );
  const reactivated = await api.functional.erpHrmTime.member.employees.update(
    memberConnection,
    {
      employeeId: employee.id,
      body: {
        status: "active",
        erpHrmTimeDepartmentId: department.id,
        erpHrmTimeRoleId: role.id,
        positionTitle: mutablePositionTitle,
        employmentType: mutableEmploymentType,
      } satisfies IErpHrmTimeEmployee.IUpdate,
    },
  );
  typia.assert(reactivated);
  TestValidator.equals(
    "reactivation preserves organization",
    reactivated.organization,
    originalOrganization,
  );
  TestValidator.equals(
    "reactivation preserves member",
    reactivated.member,
    originalMember,
  );
  TestValidator.equals(
    "reactivation keeps department",
    reactivated.department?.id,
    department.id,
  );
  TestValidator.equals("reactivation keeps role", reactivated.role.id, role.id);
  TestValidator.equals(
    "status changed to active",
    reactivated.status,
    "active",
  );
  TestValidator.equals(
    "employee identity preserved",
    reactivated.id,
    employee.id,
  );
}
