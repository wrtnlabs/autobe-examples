import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMemberMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMemberMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";

/**
 * Test project member metrics endpoint with empty project (no assigned members).
 *
 * Validates that the project member metrics endpoint correctly handles the edge case of a project with no assigned members. This test ensures proper null handling for calculated averages and zero values for all count-based metrics.
 *
 * The test creates a member user with an organization, creates a project without assigning any members, and verifies the metrics endpoint returns appropriate default values.
 *
 * 1. Register member user with email/password (creates organization context).
 * 2. Create a project within the organization without assigning members.
 * 3. Call the metrics endpoint for the empty project.
 * 4. Validate all metrics return zero counts and null for average hours.
 */
export async function test_api_project_member_metrics_empty_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member user (creates organization context)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // Extract organization ID from member's organizations array
  // Note: After registration, organizations may be empty; in simulation mode, use generated UUID
  const organizationId =
    member.organizations?.[0]?.id ??
    typia.random<string & tags.Format<"uuid">>();
  // 2. Create project without assigning members
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  // 3. Get metrics for empty project
  const metrics =
    await api.functional.hrm.member.organizations.projects.members.metrics(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
      },
    );
  typia.assert(metrics);
  // 4. Validate empty project metrics
  TestValidator.equals("total members", metrics.total_members, 0);
  TestValidator.equals("member role count", metrics.members_by_role.member, 0);
  TestValidator.equals(
    "project lead role count",
    metrics.members_by_role.project_lead,
    0,
  );
  TestValidator.equals("total hours", metrics.total_hours, 0);
  TestValidator.equals(
    "average hours per member",
    metrics.average_hours_per_member,
    null,
  );
  TestValidator.equals("active timers count", metrics.active_timers_count, 0);
}
