import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIWeeklySummaryReport";
import type { IWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeeklySummaryReport";
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
 * Test that weekly summary reports can be filtered by a specific project ID.
 *
 * Creates a new member account and project, then queries the weekly summary report endpoint with a project_id filter. Validates that the response structure is correct and properly scoped.
 *
 * Due to the lack of timelog creation endpoints, the report will return empty data. The test focuses on validating the filter mechanism and response pagination structure.
 *
 * 1. Register and authenticate a new member.
 * 2. Create a project in the organization.
 * 3. Query weekly summary report with project_id filter.
 * 4. Validate response structure and pagination metadata.
 */
export async function test_api_report_weekly_summary_project_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project in the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Query weekly summary report with project_id filter
  const reportBody = {
    project_id: project.id,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number as number,
  } satisfies IWeeklySummaryReport.IRequest;
  const report =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    report.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    report.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    report.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination records matches data length",
    report.pagination.records,
    report.data.length,
  );
}
