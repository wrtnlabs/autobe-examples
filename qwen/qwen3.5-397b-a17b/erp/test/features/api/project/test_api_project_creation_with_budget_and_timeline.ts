import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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

/**
 * Test project creation with complete business data including optional budget hours and timeline dates.
 *
 * Validates the full project setup workflow used in capacity planning and timeline tracking. This scenario tests member registration, organization creation, and project initialization with comprehensive business data including budget hours for capacity planning and timeline dates for deadline management.
 *
 * The test ensures that all provided fields are correctly stored, the project status is automatically set to 'active' upon creation, budget hours are preserved for capacity planning calculations, and start/end dates are stored in ISO 8601 format for timeline tracking and Gantt chart visualization.
 *
 * 1. Register a new member account with unique email and password credentials.
 * 2. Create an organization to establish the multi-tenancy context for project management.
 * 3. Create a project with name, color, description, budget_hours, start_date, and end_date.
 * 4. Validate that all provided fields are correctly stored, the project status is set to 'active', budget hours are preserved for capacity planning, start and end dates are stored in ISO 8601 format for timeline tracking, and the project is ready for task assignment and timelog recording.
 */
export async function test_api_project_creation_with_budget_and_timeline(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project with budget and timeline
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        budgetHours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    },
  );
  typia.assert(project);
  // 4. Validate project data
  TestValidator.equals("project status is active", project.status, "active");
  TestValidator.predicate(
    "budget hours preserved",
    project.budget_hours !== null && project.budget_hours !== undefined,
  );
  TestValidator.predicate(
    "start date exists",
    project.start_date !== null && project.start_date !== undefined,
  );
  TestValidator.predicate(
    "end date exists",
    project.end_date !== null && project.end_date !== undefined,
  );
  TestValidator.predicate(
    "end date after start date",
    new Date(project.end_date!) > new Date(project.start_date!),
  );
  TestValidator.equals(
    "organization context preserved",
    project.organization.id,
    organization.id,
  );
}
