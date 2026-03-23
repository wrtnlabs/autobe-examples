import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectUtilization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectUtilization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test project utilization calculation with timelogs.
 *
 * This test validates the project utilization endpoint by:
 * 1. Registering a new member
 * 2. Creating a project with budget hours
 * 3. Checking utilization statistics (initially zero)
 * 4. Verifying response structure and field accuracy
 */
export async function test_api_project_utilization_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project with budget hours
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 3. Check utilization (should be zero since no timelogs exist)
  const utilization =
    await api.functional.hrmPlatform.member.projects.utilization(
      memberConnection,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(utilization);
  // 4. Validate utilization metrics
  TestValidator.equals("actual hours is zero", utilization.actual_hours, 0);
  TestValidator.equals(
    "budget hours matches project",
    utilization.budget_hours,
    project.budget_hours,
  );
  TestValidator.equals(
    "utilization percentage is zero",
    utilization.utilization_percentage,
    0,
  );
  TestValidator.equals("billable hours is zero", utilization.billable_hours, 0);
  TestValidator.equals(
    "non billable hours is zero",
    utilization.non_billable_hours,
    0,
  );
  TestValidator.equals(
    "total timelog count is zero",
    utilization.total_timelog_count,
    0,
  );
}
