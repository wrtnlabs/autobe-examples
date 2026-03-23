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
 * Test project utilization endpoint when project has no budget hours defined.
 * Validates that the system correctly handles null budget scenarios:
 * - budget_hours should be null
 * - utilization_percentage should be null (no baseline for comparison)
 * - actual_hours, billable_hours, non_billable_hours should be 0
 * - total_timelog_count should be 0
 */
export async function test_api_project_utilization_without_budget(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // 2. Create a project WITHOUT budget hours (explicitly set to null)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        budget_hours: null,
      },
    },
  );
  typia.assert(project);
  // 3. Call utilization endpoint for the project without budget
  const utilization =
    await api.functional.hrmPlatform.member.projects.utilization(
      memberConnection,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(utilization);
  // 4. Validate null budget scenario
  TestValidator.equals("budget_hours is null", utilization.budget_hours, null);
  TestValidator.equals(
    "utilization_percentage is null",
    utilization.utilization_percentage,
    null,
  );
  TestValidator.equals("actual_hours is 0", utilization.actual_hours, 0);
  TestValidator.equals("billable_hours is 0", utilization.billable_hours, 0);
  TestValidator.equals(
    "non_billable_hours is 0",
    utilization.non_billable_hours,
    0,
  );
  TestValidator.equals(
    "total_timelog_count is 0",
    utilization.total_timelog_count,
    0,
  );
}
