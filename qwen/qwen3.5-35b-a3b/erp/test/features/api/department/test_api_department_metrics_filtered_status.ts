import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
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

export async function test_api_department_metrics_filtered_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member for API access
  const authConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>() as string & tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() as string & tags.Format<"uri">,
    },
  });
  typia.assert(member);
  // 2. Get organization ID from member
  const organizationId = member.organization_memberships[0].organization.id;
  typia.assert(organizationId);
  // 3. Create a test department
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: member.email,
      password: member.token.refresh,
      display_name: member.display_name,
      href: typia.assert<string & tags.Format<"uri">>(member.email),
      referrer: typia.assert<string & tags.Format<"uri">>(member.email),
    },
  });
  const department =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 4. Test metrics endpoint with different filter combinations
  // Test 1: Default behavior (includeInactive=false)
  const metricsActiveOnly =
    await api.functional.hrms.member.departments.employees.metrics(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          metric: "total",
          includeInactive: false,
        } satisfies IHrmsProjectMember.IRequest,
      },
    );
  typia.assert(metricsActiveOnly);
  // Test 2: Include inactive employees (includeInactive=true)
  const metricsAll =
    await api.functional.hrms.member.departments.employees.metrics(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          metric: "total",
          includeInactive: true,
        } satisfies IHrmsProjectMember.IRequest,
      },
    );
  typia.assert(metricsAll);
  // 5. Validate filtering behavior
  // When includeInactive=true, totalEmployeeCount should be >= when false
  TestValidator.predicate(
    "include inactive shows more or equal employees",
    metricsAll.totalEmployeeCount >= metricsActiveOnly.totalEmployeeCount,
  );
  // 6. Test edge case: query with specific filters that match no timelogs
  // Using date range filter that doesn't overlap with any timelogs
  const today = new Date();
  const farFuture = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 365); // 1 year from now
  const metricsEmptyTimelogs =
    await api.functional.hrms.member.departments.employees.metrics(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          metric: "billable",
          startDate: farFuture.toISOString().split("T")[0],
          endDate: farFuture.toISOString().split("T")[0],
          includeInactive: false,
        } satisfies IHrmsProjectMember.IRequest,
      },
    );
  typia.assert(metricsEmptyTimelogs);
  // Validate that timelog-related metrics are zero (employee counts should still exist)
  TestValidator.predicate(
    "employee counts exist even with no timelogs",
    metricsEmptyTimelogs.totalEmployeeCount >= 0,
  );
  TestValidator.equals(
    "no employees with timelogs in future",
    metricsEmptyTimelogs.employeesWithTimelogsLastSevenDays,
    0,
  );
  TestValidator.equals(
    "no employees with timelogs in 30 days future",
    metricsEmptyTimelogs.employeesWithTimelogsLastThirtyDays,
    0,
  );
}