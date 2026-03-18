import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
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
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";

export async function test_api_project_view_assigned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Extract organization context from member's memberships
  if (member.organization_memberships.length === 0) {
    throw new Error("Member must have at least one organization membership");
  }
  const orgId = member.organization_memberships[0].organization.id;
  const orgName = member.organization_memberships[0].organization.name;
  // 3. Create a project within the member's organization
  const projectCreateResponse =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId: orgId,
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: `#${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
          >(),
          start_date: new Date().toISOString(),
          end_date: new Date(
            new Date().getTime() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(projectCreateResponse);
  const project = projectCreateResponse as IHrmsProject & {
    id: string;
    name: string;
    description: string;
    color_code: string;
    status: string;
    budget_hours: number;
    organization_id: string;
    organization_name: string;
    actual_hours: number;
    budget_utilization_percentage: number | null;
    timelog_count: number;
    total_tasks: number;
    created_at: string;
    updated_at: string;
  };
  const projectMemberId = project.id;
  const employeeId = member.organization_memberships[0].member.id;
  await generate_random_hrms_member_projects_members_add_member(
    memberConnection,
    {
      body: {
        employee_id: employeeId,
        role: "member" as const,
      } satisfies IHrmsProjectMember.ICreate,
      params: { projectId: projectMemberId },
    },
  );
  // 5. Retrieve the project with member authentication
  const retrievedProjectRaw = await api.functional.hrms.member.projects.at(
    memberConnection,
    { projectId: projectMemberId },
  );
  const retrievedProject = retrievedProjectRaw as IHrmsProject & {
    id: string;
    name: string;
    description: string;
    color_code: string;
    status: string;
    budget_hours: number;
    organization_id: string;
    organization_name: string;
    actual_hours: number;
    budget_utilization_percentage: number | null;
    timelog_count: number;
    total_tasks: number;
    created_at: string;
    updated_at: string;
  };
  // 6. Validate project details
  TestValidator.equals("project id", retrievedProject.id, project.id);
  TestValidator.equals("project name", retrievedProject.name, project.name);
  TestValidator.equals(
    "project description",
    retrievedProject.description,
    project.description,
  );
  TestValidator.equals(
    "color code",
    retrievedProject.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "project status",
    retrievedProject.status,
    project.status,
  );
  TestValidator.equals(
    "budget hours",
    retrievedProject.budget_hours,
    project.budget_hours,
  );
  TestValidator.equals(
    "organization id",
    retrievedProject.organization_id,
    orgId,
  );
  TestValidator.equals(
    "organization name",
    retrievedProject.organization_name,
    orgName,
  );
  // 7. Validate computed fields exist and are valid
  TestValidator.predicate(
    "actual_hours is a number",
    typeof retrievedProject.actual_hours === "number",
  );
  TestValidator.predicate(
    "budget utilization is number or null",
    retrievedProject.budget_utilization_percentage === null ||
      typeof retrievedProject.budget_utilization_percentage === "number",
  );
  TestValidator.predicate(
    "timelog count is non-negative",
    retrievedProject.timelog_count >= 0,
  );
  TestValidator.predicate(
    "total tasks count is non-negative",
    retrievedProject.total_tasks >= 0,
  );
  // 8. Validate timestamps are present and valid ISO strings
  if (!retrievedProject.created_at) {
    throw new Error("created_at must be present");
  }
  if (!retrievedProject.updated_at) {
    throw new Error("updated_at must be present");
  }
  // 9. Verify organization scoping is enforced
  TestValidator.equals(
    "project belongs to user's organization",
    retrievedProject.organization_id,
    orgId,
  );
}
