import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeRole";
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
import { generate_random_hrm_time_tracking_member_employees_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_roles_create";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_employee_role_single_active_assignment(
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
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const firstRole = await generate_random_hrm_time_tracking_member_roles_create(
    memberConnection,
    {
      body: {
        name: `Role ${RandomGenerator.alphabets(6)} A`,
        code: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        sortOrder: 1,
      } satisfies IHrmTimeTrackingRole.ICreate,
    },
  );
  typia.assert(firstRole);
  const secondRole =
    await generate_random_hrm_time_tracking_member_roles_create(
      memberConnection,
      {
        body: {
          name: `Role ${RandomGenerator.alphabets(6)} B`,
          code: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sortOrder: 2,
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(secondRole);
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: authorized.id,
          roleId: firstRole.id,
          departmentId: null,
          positionTitle: RandomGenerator.name(2),
          employmentType: "full_time",
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  TestValidator.equals(
    "employee starts with initial role",
    employee.role.id,
    firstRole.id,
  );
  TestValidator.equals(
    "employee organization is preserved",
    employee.organization.id,
    organization.id,
  );
  const updated =
    await api.functional.hrmTimeTracking.member.employees.roles.patchByEmployeeid(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          hrmTimeTrackingRoleId: secondRole.id,
        } satisfies IHrmTimeTrackingEmployeeRole.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "employee role is replaced",
    updated.role.id,
    secondRole.id,
  );
  TestValidator.equals(
    "employee stays in same organization",
    updated.organization.id,
    organization.id,
  );
  TestValidator.notEquals(
    "role assignment changed",
    updated.role.id,
    firstRole.id,
  );
  TestValidator.equals("employee keeps same identity", updated.id, employee.id);
}
