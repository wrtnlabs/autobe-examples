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

export async function test_api_employee_role_reassignment_success(
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
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const sourceRole =
    await generate_random_hrm_time_tracking_member_roles_create(
      memberConnection,
      {
        body: {
          name: `source-${RandomGenerator.alphabets(8)}`,
          code: null,
          description: "source role",
          sortOrder: 1,
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(sourceRole);
  const targetRole =
    await generate_random_hrm_time_tracking_member_roles_create(
      memberConnection,
      {
        body: {
          name: `target-${RandomGenerator.alphabets(8)}`,
          code: null,
          description: "target role",
          sortOrder: 2,
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(targetRole);
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: typia.random<string & tags.Format<"uuid">>(),
          roleId: sourceRole.id,
          departmentId: null,
          positionTitle: RandomGenerator.name(),
          employmentType: "full-time",
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  TestValidator.equals(
    "employee starts with source role",
    employee.role.id,
    sourceRole.id,
  );
  TestValidator.equals(
    "employee belongs to the created organization",
    employee.organization.id,
    organization.id,
  );
  const reassigned =
    await api.functional.hrmTimeTracking.member.employees.roles.patchByEmployeeid(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          hrmTimeTrackingRoleId: targetRole.id,
        } satisfies IHrmTimeTrackingEmployeeRole.IUpdate,
      },
    );
  typia.assert(reassigned);
  TestValidator.equals(
    "employee id remains the same",
    reassigned.id,
    employee.id,
  );
  TestValidator.equals(
    "organization remains the same",
    reassigned.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "role updated to target role",
    reassigned.role.id,
    targetRole.id,
  );
  TestValidator.notEquals(
    "role changed from source to target",
    reassigned.role.id,
    sourceRole.id,
  );
  TestValidator.equals(
    "employee remains assigned to exactly one active role in the same organization",
    reassigned.role.organization.id,
    organization.id,
  );
}
