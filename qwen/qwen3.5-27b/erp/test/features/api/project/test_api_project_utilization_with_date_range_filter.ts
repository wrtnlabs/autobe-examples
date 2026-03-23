import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectUtilization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectUtilization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the date range filtering capability of the project utilization endpoint.
 * Verifies that optional request body parameters (start_date, end_date) correctly
 * filter timelogs for utilization calculation across different scenarios.
 */
export async function test_api_project_utilization_with_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Setup: Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 3. Setup: Create timelogs on different dates
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  // Timelog 1: 3 days ago (480 minutes = 8 hours)
  const date1 = new Date(now.getTime() - 3 * dayMs).toISOString();
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: date1,
        duration: 480,
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  // Timelog 2: 2 days ago (360 minutes = 6 hours)
  const date2 = new Date(now.getTime() - 2 * dayMs).toISOString();
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: date2,
        duration: 360,
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  // Timelog 3: 1 day ago (240 minutes = 4 hours, non-billable)
  const date3 = new Date(now.getTime() - 1 * dayMs).toISOString();
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: date3,
        duration: 240,
        billable: false,
      },
    },
  );
  typia.assert(timelog3);
  // Timelog 4: Today (600 minutes = 10 hours)
  const date4 = new Date(now.getTime()).toISOString();
  const timelog4 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: date4,
        duration: 600,
        billable: true,
      },
    },
  );
  typia.assert(timelog4);
  // 4. Test Scenario 1: No date filter (all timelogs)
  const utilizationAll =
    await api.functional.hrmPlatform.member.projects.utilization(
      memberConnection,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(utilizationAll);
  TestValidator.equals(
    "all timelogs - total count",
    utilizationAll.total_timelog_count,
    4,
  );
  TestValidator.equals(
    "all timelogs - actual hours (8+6+4+10=28)",
    utilizationAll.actual_hours,
    28,
  );
  TestValidator.equals(
    "all timelogs - billable hours (8+6+10=24)",
    utilizationAll.billable_hours,
    24,
  );
  TestValidator.equals(
    "all timelogs - non-billable hours (4)",
    utilizationAll.non_billable_hours,
    4,
  );
  TestValidator.equals(
    "all timelogs - utilization percentage (28/100*100=28)",
    utilizationAll.utilization_percentage,
    28,
  );
  // 5. Test Scenario 2: Start date only (from 2 days ago onwards)
  const utilizationFromStart =
    await api.functional.hrmPlatform.member.projects.utilization(
      memberConnection,
      {
        projectId: project.id,
        body: {
          start_date: date2,
        },
      },
    );
  typia.assert(utilizationFromStart);
  TestValidator.equals(
    "from start_date - total count (timelogs 2,3,4)",
    utilizationFromStart.total_timelog_count,
    3,
  );
  TestValidator.equals(
    "from start_date - actual hours (6+4+10=20)",
    utilizationFromStart.actual_hours,
    20,
  );
  TestValidator.equals(
    "from start_date - billable hours (6+10=16)",
    utilizationFromStart.billable_hours,
    16,
  );
  TestValidator.equals(
    "from start_date - non-billable hours (4)",
    utilizationFromStart.non_billable_hours,
    4,
  );
  TestValidator.equals(
    "from start_date - utilization percentage (20/100*100=20)",
    utilizationFromStart.utilization_percentage,
    20,
  );
  // 6. Test Scenario 3: End date only (up to 1 day ago)
  const utilizationUntilEnd =
    await api.functional.hrmPlatform.member.projects.utilization(
      memberConnection,
      {
        projectId: project.id,
        body: {
          end_date: date3,
        },
      },
    );
  typia.assert(utilizationUntilEnd);
  TestValidator.equals(
    "until end_date - total count (timelogs 1,2,3)",
    utilizationUntilEnd.total_timelog_count,
    3,
  );
  TestValidator.equals(
    "until end_date - actual hours (8+6+4=18)",
    utilizationUntilEnd.actual_hours,
    18,
  );
  TestValidator.equals(
    "until end_date - billable hours (8+6=14)",
    utilizationUntilEnd.billable_hours,
    14,
  );
  TestValidator.equals(
    "until end_date - non-billable hours (4)",
    utilizationUntilEnd.non_billable_hours,
    4,
  );
  TestValidator.equals(
    "until end_date - utilization percentage (18/100*100=18)",
    utilizationUntilEnd.utilization_percentage,
    18,
  );
  // 7. Test Scenario 4: Both start and end date (from 3 days ago to 1 day ago)
  const utilizationRange =
    await api.functional.hrmPlatform.member.projects.utilization(
      memberConnection,
      {
        projectId: project.id,
        body: {
          start_date: date1,
          end_date: date3,
        },
      },
    );
  typia.assert(utilizationRange);
  TestValidator.equals(
    "date range - total count (timelogs 1,2,3)",
    utilizationRange.total_timelog_count,
    3,
  );
  TestValidator.equals(
    "date range - actual hours (8+6+4=18)",
    utilizationRange.actual_hours,
    18,
  );
  TestValidator.equals(
    "date range - billable hours (8+6=14)",
    utilizationRange.billable_hours,
    14,
  );
  TestValidator.equals(
    "date range - non-billable hours (4)",
    utilizationRange.non_billable_hours,
    4,
  );
  TestValidator.equals(
    "date range - utilization percentage (18/100*100=18)",
    utilizationRange.utilization_percentage,
    18,
  );
}
