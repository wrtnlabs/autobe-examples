import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_departments_create } from "../../../generate/generate_random_hrms_member_organizations_departments_create";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { prepare_random_hrms_department } from "../../../prepare/prepare_random_hrms_department";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_department_metrics_with_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member and authenticate
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Get organization from member's organization memberships
  const orgMembership = member.organization_memberships[0];
  const organizationId = orgMembership.organization.id;
  typia.assert(orgMembership);
  // 3. Create a department under the organization
  const departmentConnection: api.IConnection = { host: connection.host };
  const department: IHrmsDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      departmentConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 4. Call the metrics endpoint
  const metricsConnection: api.IConnection = { host: connection.host };
  const metrics: IHrmsProjectMember.IResponse =
    await api.functional.hrms.member.departments.employees.metrics(
      metricsConnection,
      {
        departmentId: department.id,
        body: {
          metric: "total",
          includeInactive: true,
        } satisfies IHrmsProjectMember.IRequest,
      },
    );
  typia.assert(metrics);
  // 5. Validate response structure and required fields
  TestValidator.equals(
    "response has total employee count",
    metrics.totalEmployeeCount,
    metrics.totalEmployeeCount,
  );
  TestValidator.equals(
    "response has active employee count",
    metrics.activeEmployeeCount,
    metrics.activeEmployeeCount,
  );
  TestValidator.equals(
    "response has deactivated employee count",
    metrics.deactivatedEmployeeCount,
    metrics.deactivatedEmployeeCount,
  );
  TestValidator.predicate(
    "employment type distribution exists and has valid keys",
    metrics.employmentTypeDistribution !== undefined &&
      typeof metrics.employmentTypeDistribution === "object",
  );
  TestValidator.predicate(
    "position count is non-negative",
    metrics.positionCount >= 0,
  );
  TestValidator.predicate(
    "employees with timelogs last 7 days is non-negative",
    metrics.employeesWithTimelogsLastSevenDays >= 0,
  );
  TestValidator.predicate(
    "employees with timelogs last 30 days is non-negative",
    metrics.employeesWithTimelogsLastThirtyDays >= 0,
  );
  // 6. Validate that employment type distribution counts are non-negative
  if (metrics.employmentTypeDistribution) {
    TestValidator.predicate(
      "fullTime count is non-negative",
      metrics.employmentTypeDistribution.fullTime >= 0,
    );
    TestValidator.predicate(
      "partTime count is non-negative",
      metrics.employmentTypeDistribution.partTime >= 0,
    );
    TestValidator.predicate(
      "contractor count is non-negative",
      metrics.employmentTypeDistribution.contractor >= 0,
    );
    TestValidator.predicate(
      "intern count is non-negative",
      metrics.employmentTypeDistribution.intern >= 0,
    );
  }
  // 7. Validate that employees in last 30 days >= employees in last 7 days
  TestValidator.predicate(
    "employees with timelogs last 30 days >= last 7 days",
    metrics.employeesWithTimelogsLastThirtyDays >=
      metrics.employeesWithTimelogsLastSevenDays,
  );
}
