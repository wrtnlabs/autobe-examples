import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectWeeklySummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectWeeklySummary";
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
 * Verify that retrieving the weekly time tracking report for a valid project that has no timelogs returns a paginated response with an empty data array and correct pagination structure. The project exists but contains no time entries.
 *
 * Tests the pagination structure and empty data array when a project is newly created without any timelog entries. Validates that the response conforms to the expected pagination metadata (current, limit, records, pages) and that the data array is empty. Ensures the endpoint handles the edge case of zero timelogs gracefully without throwing errors.
 *
 * 1. Authenticate a new member account and automatically create a default organization.
 * 2. Create a new project within the organization without adding any timelogs.
 * 3. Retrieve the weekly time tracking report for the newly created project.
 * 4. Validate that the response contains an empty data array and correct pagination structure.
 */
export async function test_api_project_weekly_report_empty(
  connection: api.IConnection,
) {
  // 1. Authenticate member to create organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a project without any timelogs
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Retrieve weekly report for the project
  const report =
    await api.functional.hrmPlatform.member.projects.reports.weekly.at(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(report);
  // 4. Validate empty data array and pagination structure
  TestValidator.equals("data array is empty", report.data.length, 0);
  TestValidator.equals("pagination current is 0", report.pagination.current, 0);
  TestValidator.equals("pagination records is 0", report.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", report.pagination.pages, 0);
  TestValidator.predicate(
    "pagination limit is positive",
    report.pagination.limit > 0,
  );
}
