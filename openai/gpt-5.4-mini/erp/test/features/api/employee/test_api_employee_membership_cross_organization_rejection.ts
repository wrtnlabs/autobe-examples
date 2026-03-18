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
import { generate_random_hrm_time_tracking_member_employees_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_create";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";

export async function test_api_employee_membership_cross_organization_rejection(
  connection: api.IConnection,
): Promise<void> {
  const sourceConnection: api.IConnection = { host: connection.host };
  const sourceAuth = await authorize_member_join(sourceConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(sourceAuth);
  const foreignConnection: api.IConnection = { host: connection.host };
  const foreignAuth = await authorize_member_join(foreignConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(foreignAuth);
  const sourceEmployee =
    await api.functional.hrmTimeTracking.member.employees.create(
      sourceConnection,
      {
        body: {
          userAccountId: sourceAuth.id,
          roleId: typia.random<string & tags.Format<"uuid">>(),
          departmentId: null,
          positionTitle: RandomGenerator.name(),
          employmentType: RandomGenerator.pick([
            "full_time",
            "part_time",
            "contractor",
          ] as const),
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(sourceEmployee);
  const snapshot = JSON.parse(
    JSON.stringify(sourceEmployee),
  ) as IHrmTimeTrackingEmployee;
  TestValidator.equals(
    "created employee uses the source member account",
    sourceEmployee.userAccount,
    sourceEmployee.userAccount,
  );
  TestValidator.equals(
    "created employee is attached to a single organization",
    sourceEmployee.organization,
    sourceEmployee.organization,
  );
  const invalidUpdate = {
    department_id: typia.random<string & tags.Format<"uuid">>(),
    position_title: RandomGenerator.name(),
    employment_type: RandomGenerator.pick([
      "full_time",
      "part_time",
      "contractor",
    ] as const),
    status: "active",
  } satisfies IHrmTimeTrackingEmployee.IUpdate;
  await TestValidator.error(
    "cross-organization employee update should be rejected",
    async () => {
      await api.functional.hrmTimeTracking.member.employees.putByEmployeeid(
        sourceConnection,
        {
          employeeId: sourceEmployee.id,
          body: invalidUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "employee id remains unchanged",
    sourceEmployee.id,
    snapshot.id,
  );
  TestValidator.equals(
    "organization remains unchanged",
    sourceEmployee.organization,
    snapshot.organization,
  );
  TestValidator.equals(
    "linked user account remains unchanged",
    sourceEmployee.userAccount,
    snapshot.userAccount,
  );
  TestValidator.equals(
    "role remains unchanged",
    sourceEmployee.role,
    snapshot.role,
  );
  TestValidator.equals(
    "department remains unchanged",
    sourceEmployee.department,
    snapshot.department,
  );
  TestValidator.equals(
    "position title remains unchanged",
    sourceEmployee.positionTitle,
    snapshot.positionTitle,
  );
  TestValidator.equals(
    "employment type remains unchanged",
    sourceEmployee.employmentType,
    snapshot.employmentType,
  );
  TestValidator.equals(
    "status remains unchanged",
    sourceEmployee.status,
    snapshot.status,
  );
  TestValidator.equals(
    "createdAt remains unchanged",
    sourceEmployee.createdAt,
    snapshot.createdAt,
  );
  TestValidator.equals(
    "updatedAt remains unchanged",
    sourceEmployee.updatedAt,
    snapshot.updatedAt,
  );
  TestValidator.equals(
    "deletedAt remains unchanged",
    sourceEmployee.deletedAt,
    snapshot.deletedAt,
  );
}
