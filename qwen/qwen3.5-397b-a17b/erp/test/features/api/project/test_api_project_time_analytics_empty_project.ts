import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectTimeAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectTimeAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_project_time_analytics_empty_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Create organization for the member
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 4. Create active project with no timelogs
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Call analytics endpoint for empty project
  const analytics =
    await api.functional.hrmPlatform.member.projects.analytics.time.analyticsTime(
      memberConnection,
      {
        projectId: project.id,
        body: {} satisfies IHrmPlatformProjectTimeAnalytic.IRequest,
      },
    );
  typia.assert(analytics);
  // 6. Validate empty project analytics
  TestValidator.equals("totalHours is zero", analytics.totalHours, 0);
  TestValidator.equals("totalMinutes is zero", analytics.totalMinutes, 0);
  TestValidator.equals(
    "employeeBreakdown is empty",
    analytics.employeeBreakdown.length,
    0,
  );
  TestValidator.equals(
    "taskBreakdown is empty",
    analytics.taskBreakdown.length,
    0,
  );
  TestValidator.equals(
    "dailyBreakdown is empty",
    analytics.dailyBreakdown.length,
    0,
  );
  TestValidator.equals(
    "billableMinutes is zero",
    analytics.billableBreakdown.billableMinutes,
    0,
  );
  TestValidator.equals(
    "nonBillableMinutes is zero",
    analytics.billableBreakdown.nonBillableMinutes,
    0,
  );
  TestValidator.equals(
    "billableHours is zero",
    analytics.billableBreakdown.billableHours,
    0,
  );
  TestValidator.equals(
    "nonBillableHours is zero",
    analytics.billableBreakdown.nonBillableHours,
    0,
  );
  TestValidator.equals("fromDate is null", analytics.dateRange.fromDate, null);
  TestValidator.equals("toDate is null", analytics.dateRange.toDate, null);
}
