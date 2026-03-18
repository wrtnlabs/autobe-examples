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

export async function test_api_employee_role_reassignment_cross_organization_denied(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
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
  const role = await generate_random_hrm_time_tracking_member_roles_create(
    memberConnection,
    {
      body: {
        name: `role-${RandomGenerator.alphabets(8)}`,
        code: `code-${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        sortOrder: 1,
      } satisfies IHrmTimeTrackingRole.ICreate,
    },
  );
  typia.assert(role);
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: typia.random<string & tags.Format<"uuid">>(),
          roleId: role.id,
          departmentId: null,
          positionTitle: RandomGenerator.name(),
          employmentType: "full-time",
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  const reassigned =
    await api.functional.hrmTimeTracking.member.employees.roles.patchByEmployeeid(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          hrmTimeTrackingRoleId: role.id,
        } satisfies IHrmTimeTrackingEmployeeRole.IUpdate,
      },
    );
  typia.assert(reassigned);
  TestValidator.equals(
    "role reassignment keeps the same organization role",
    reassigned.role.id,
    role.id,
  );
  await TestValidator.error(
    "cross-organization role reassignment should be denied",
    async () => {
      const foreignConnection: api.IConnection = { host: connection.host };
      await authorize_member_join(foreignConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IHrmTimeTrackingMember.IJoin,
      });
      const foreignOrganization =
        await generate_random_hrm_time_tracking_member_organizations_create(
          foreignConnection,
          {
            body: {
              name: `foreign-org-${RandomGenerator.alphabets(8)}`,
              description: RandomGenerator.paragraph({ sentences: 2 }),
              currency: "USD",
              timezone: "Asia/Seoul",
              fiscalStartMonth: 1,
            } satisfies IHrmTimeTrackingOrganization.ICreate,
          },
        );
      typia.assert(foreignOrganization);
      const foreignRole =
        await generate_random_hrm_time_tracking_member_roles_create(
          foreignConnection,
          {
            body: {
              name: `foreign-role-${RandomGenerator.alphabets(8)}`,
              code: `foreign-code-${RandomGenerator.alphabets(6)}`,
              description: RandomGenerator.paragraph({ sentences: 2 }),
              sortOrder: 2,
            } satisfies IHrmTimeTrackingRole.ICreate,
          },
        );
      typia.assert(foreignRole);
      await api.functional.hrmTimeTracking.member.employees.roles.patchByEmployeeid(
        memberConnection,
        {
          employeeId: employee.id,
          body: {
            hrmTimeTrackingRoleId: foreignRole.id,
          } satisfies IHrmTimeTrackingEmployeeRole.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "employee remains assigned to the original role after denied foreign reassignment",
    reassigned.role.id,
    role.id,
  );
}
