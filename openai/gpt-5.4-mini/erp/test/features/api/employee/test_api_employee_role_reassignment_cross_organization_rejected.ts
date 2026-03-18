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
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_roles_create";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_employee_role_reassignment_cross_organization_rejected(
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
  const organizationOne =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationOne);
  const organizationTwo =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationTwo);
  const employeeAccount = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(employeeAccount);
  const organizationOneConnection: api.IConnection = { host: connection.host };
  organizationOneConnection.headers = {
    Authorization: member.token.access,
  } as Record<string, string>;
  const originalRole =
    await generate_random_hrm_time_tracking_member_roles_create(
      organizationOneConnection,
      {
        body: {
          name: `role-${RandomGenerator.alphaNumeric(8)}`,
          code: null,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sortOrder: 1,
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(originalRole);
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      organizationOneConnection,
      {
        body: {
          userAccountId: employeeAccount.id,
          roleId: originalRole.id,
          departmentId: null,
          positionTitle: RandomGenerator.name(),
          employmentType: "full_time",
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  const organizationTwoConnection: api.IConnection = { host: connection.host };
  organizationTwoConnection.headers = {
    Authorization: member.token.access,
  } as Record<string, string>;
  const crossTenantRole =
    await generate_random_hrm_time_tracking_member_roles_create(
      organizationTwoConnection,
      {
        body: {
          name: `role-${RandomGenerator.alphaNumeric(8)}`,
          code: null,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sortOrder: 2,
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(crossTenantRole);
  await TestValidator.httpError(
    "cross-organization employee role reassignment should be rejected",
    [400, 403, 404, 409],
    async () => {
      await api.functional.hrmTimeTracking.member.employees.roles.putByEmployeeidAndEmployeeroleid(
        organizationOneConnection,
        {
          employeeId: employee.id,
          employeeRoleId: crossTenantRole.id,
        },
      );
    },
  );
  TestValidator.equals(
    "employee remains in first organization",
    employee.organization.id,
    organizationOne.id,
  );
  TestValidator.equals(
    "employee keeps original role",
    employee.role.id,
    originalRole.id,
  );
}
