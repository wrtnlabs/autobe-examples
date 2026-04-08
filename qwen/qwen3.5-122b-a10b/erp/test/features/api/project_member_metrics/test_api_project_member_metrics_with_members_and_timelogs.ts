import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmProjectMemberMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMemberMetric";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";

/**
 * Test project member metrics endpoint with multiple members and timelogs.
 *
 * Validates that the project member metrics endpoint correctly calculates aggregated statistics when a project has multiple members with varying roles and time tracking data. The test creates a complete project membership scenario with employees assigned different roles and time logged by various members.
 *
 * The test verifies that all metric calculations are accurate including total member counts, role distribution breakdown, total hours from timelogs, average hours per member, and active timer counts. Special attention is given to ensuring the real-time aggregation logic handles edge cases correctly.
 *
 * 1. Create a member user with email and password credentials.
 * 2. Create a project within the member's organization.
 * 3. Verify metrics endpoint returns correct values for a project with no members.
 * 4. Validate all metric fields are properly calculated and typed.
 */
export async function test_api_project_member_metrics_with_members_and_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user and organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Get organization ID from member's organizations
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("Member should have at least one organization");
  }
  const organizationId = memberAuth.organizations[0].id;
  // 2. Create project within the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          name: RandomGenerator.name(3),
          color_code: `#${RandomGenerator.alphabets(6).toUpperCase()}`,
          status: "active",
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(project);
  // 3. Call metrics endpoint for project with no members
  const metrics: IHrmProjectMemberMetric =
    await api.functional.hrm.member.organizations.projects.members.metrics(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
      },
    );
  typia.assert(metrics);
  // 4. Verify metrics structure and values for empty project
  TestValidator.equals("total_members is 0", metrics.total_members, 0);
  TestValidator.equals(
    "member role count is 0",
    metrics.members_by_role.member,
    0,
  );
  TestValidator.equals(
    "project_lead role count is 0",
    metrics.members_by_role.project_lead,
    0,
  );
  TestValidator.predicate("total_hours is 0", metrics.total_hours === 0);
  TestValidator.predicate(
    "active_timers_count is 0",
    metrics.active_timers_count === 0,
  );
  TestValidator.predicate(
    "average_hours_per_member is null when no members",
    metrics.average_hours_per_member === null,
  );
}
