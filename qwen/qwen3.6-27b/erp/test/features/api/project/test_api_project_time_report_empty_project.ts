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
 * Test retrieving an aggregated time tracking report for a newly created project with no time entries logged.
 *
 * Validates the reporting endpoint's ability to accurately reflect a zero-state project. The test flow
 * authenticates a member via join to establish session access to organization-scoped resources. A new project
 * is created without any timelog entries. The target endpoint is called to retrieve the time report for the
 * newly created project.
 *
 * The response is verified to ensure structural correctness and accurate empty-state reporting:
 * 1. Verifies the returned total logged minutes equals 0.
 * 2. Verifies the returned timelog count equals 0.
 * 3. Ensures the report accurately reflects the zero entries present in the newly created project.
 */
export async function test_api_project_time_report_empty_project(
  connection: api.IConnection,
) {
  // 1. Authenticate as member to access organization-scoped project reports
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@example.com",
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a project with no timelogs to test empty aggregation behavior
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF0000",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Call the target endpoint to retrieve the project time report
  const report =
    await api.functional.hrmPlatform.member.projects.reports.time.timeReport(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(report);
  // 4. Verify the response returns total logged minutes and timelog count as 0
  TestValidator.equals("report total_minutes", report.total_minutes, 0);
  TestValidator.equals("report timelog_count", report.timelog_count, 0);
}
