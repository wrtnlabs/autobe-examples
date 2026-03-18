import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";

export async function test_api_project_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to obtain authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // 2. Select organization context from member's organization memberships
  TestValidator.equals(
    "member should have at least one organization",
    authorizedMember.organization_memberships.length,
    1,
  );
  const organizationMembership = authorizedMember.organization_memberships[0];
  const organizationId = organizationMembership.organization.id;
  // 3. Prepare project creation data
  const projectName = RandomGenerator.paragraph({ sentences: 3 });
  const projectColor = `#${typia.random<string & tags.Format<"uuid">>().replace(/-/g, "").substring(0, 6)}`;
  const body = {
    name: projectName,
    color_code: projectColor,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    budget_hours: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100>
    >(),
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IHrmsProject.ICreate;
  // 4. Create project using SDK with actor-specific connection
  const rawProject =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        body,
        organizationId,
      },
    );
  // Cast to correct type - SDK returns IHrmsProject but should return IHrmsProject.ISummary
  const project = typia.assert<IHrmsProject.ISummary>(rawProject);
  // 5. Validate project creation
  TestValidator.equals("project name matches", project.name, projectName);
  TestValidator.equals(
    "project color code has hash prefix",
    project.color_code.startsWith("#"),
    true,
  );
  TestValidator.equals(
    "project has valid color length",
    project.color_code.length,
    7,
  );
  TestValidator.equals("project status is active", project.status, "active");
  TestValidator.predicate("project id is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      project.id,
    ),
  );
  TestValidator.equals(
    "project organization matches",
    project.organization_id,
    organizationId,
  );
  TestValidator.equals(
    "project organization name matches",
    project.organization_name,
    organizationMembership.organization.name,
  );
  TestValidator.equals(
    "project description set",
    project.description,
    body.description ?? "",
  );
  TestValidator.equals(
    "project budget hours matches",
    project.budget_hours,
    body.budget_hours,
  );
  TestValidator.equals(
    "project start date matches",
    project.start_date,
    body.start_date,
  );
  TestValidator.equals(
    "project end date matches",
    project.end_date,
    body.end_date,
  );
  TestValidator.equals(
    "project has valid timestamps",
    project.created_at !== null && project.updated_at !== null,
    true,
  );
  TestValidator.equals(
    "timestamps are ISO format",
    !isNaN(new Date(project.created_at).getTime()) &&
      !isNaN(new Date(project.updated_at).getTime()),
    true,
  );
  TestValidator.equals(
    "project has non-null planned hours",
    project.planned_hours,
    project.budget_hours ?? 0,
  );
  TestValidator.equals(
    "project actual hours is 0 initially",
    project.actual_hours,
    0,
  );
  TestValidator.equals(
    "project budget utilization is null initially",
    project.budget_utilization_percentage,
    null,
  );
  TestValidator.equals("project total tasks is 0", project.total_tasks, 0);
  TestValidator.equals("project pending tasks is 0", project.pending_tasks, 0);
  TestValidator.equals(
    "project in progress tasks is 0",
    project.in_progress_tasks,
    0,
  );
  TestValidator.equals(
    "project completed tasks is 0",
    project.completed_tasks,
    0,
  );
  TestValidator.equals("project closed tasks is 0", project.closed_tasks, 0);
  TestValidator.equals("project timelog count is 0", project.timelog_count, 0);
}
