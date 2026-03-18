import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_departments_create } from "../../../generate/generate_random_hrms_member_organizations_departments_create";
import { prepare_random_hrms_department } from "../../../prepare/prepare_random_hrms_department";

export async function test_api_department_metrics_empty_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const authConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // Create connection with token for authenticated requests
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // 2. Get organization list
  const orgs = await api.functional.hrms.member.organizations.index(
    memberAuthConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmsOrganization.IRequest,
    },
  );
  typia.assert(orgs);
  // Validate we have at least one organization
  TestValidator.predicate("has organizations", orgs.data.length > 0);
  // Use first organization
  const organization = orgs.data[0];
  TestValidator.equals("organization id", organization.id, organization.id);
  // 3. Create a department with no employees
  const department =
    await api.functional.hrms.member.organizations.departments.create(
      memberAuthConnection,
      {
        organizationId: organization.id,
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(department);
  TestValidator.equals("department id", department.id, department.id);
  TestValidator.equals("department name", department.name, department.name);
  // 4. Call metrics endpoint on empty department
  const metrics =
    await api.functional.hrms.member.departments.employees.metrics(
      memberAuthConnection,
      {
        departmentId: department.id,
        body: {
          metric: "total",
        } satisfies IHrmsProjectMember.IRequest,
      },
    );
  typia.assert(metrics);
  // 5. Validate all metric fields return 0/default values for empty department
  TestValidator.equals("total employee count", metrics.totalEmployeeCount, 0);
  TestValidator.equals("active employee count", metrics.activeEmployeeCount, 0);
  TestValidator.equals(
    "deactivated employee count",
    metrics.deactivatedEmployeeCount,
    0,
  );
  // Validate employment type distribution has zero values
  const employmentDist = metrics.employmentTypeDistribution;
  const expectedTypes = ["fullTime", "partTime", "contractor", "intern"];
  for (const type of expectedTypes) {
    TestValidator.equals(
      `employment type ${type} count`,
      employmentDist[type] ?? 0,
      0,
    );
  }
  // Validate activity metrics
  TestValidator.equals(
    "employees with timelogs last 7 days",
    metrics.employeesWithTimelogsLastSevenDays,
    0,
  );
  TestValidator.equals(
    "employees with timelogs last 30 days",
    metrics.employeesWithTimelogsLastThirtyDays,
    0,
  );
  // Validate position count
  TestValidator.equals("position count", metrics.positionCount, 0);
}
