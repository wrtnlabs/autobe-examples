import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectTimeReport";
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
 * Test retrieving aggregated time tracking report for a project with budget allocation.
 *
 * Validates the project time report endpoint by authenticating a member, creating a project with budget, and retrieving the reporting data. Ensures that the report contains proper per-employee breakdowns with correct field types and structure.
 *
 * Special attention is given to verifying the response conforms to the expected time report structure with employee identification and time metrics.
 *
 * 1. Authenticate a new member via join to establish organizational session.
 * 2. Create a new project with a defined budget for time tracking.
 * 3. Retrieve the project time report via the reporting endpoint.
 * 4. Validate that the response structure includes all required fields with correct types.
 */
export async function test_api_project_time_report_with_budget_utilization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create project with budget for time tracking allocation
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
        description: null,
        budget: 500,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Retrieve project time report
  const timeReport =
    await api.functional.hrmPlatform.member.projects.reports.time.timeReport(
      memberConnection,
      { projectId: project.id },
    );
  typia.assert(timeReport);
  // 4. Validate response structure and business values
  TestValidator.predicate(
    "employee_name is non-empty",
    timeReport.employee_name.length > 0,
  );
  TestValidator.predicate(
    "total_minutes is non-negative",
    timeReport.total_minutes >= 0,
  );
  TestValidator.predicate(
    "timelog_count is non-negative",
    timeReport.timelog_count >= 0,
  );
  // Verify project budget was correctly set
  TestValidator.equals("project budget matches", project.budget, 500);
}
