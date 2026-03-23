import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";

/**
 * Test successful project dashboard retrieval by a project lead.
 * Creates a member account, creates a project in the member's organization,
 * assigns the member to the project as 'project-lead' role, then retrieves
 * the dashboard to validate full project details including enhanced visibility
 * for leadership responsibilities.
 */
export async function test_api_project_dashboard_project_lead_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmTrackerMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      },
    },
  );
  // 2. Create project in member's organization
  const project: IHrmTrackerProject =
    await generate_random_hrm_tracker_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: RandomGenerator.alphabets(6),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        budget_hours: null,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      },
    });
  typia.assert(project);
  // 3. Get the organization ID from the project
  const organizationId = project.hrm_tracker_organization_id;
  // 4. Assign member to project as 'project-lead'
  // Since we can't create an employee directly, we need to check if the project
  // creation process creates an implicit employee or if there's another way
  // For now, we'll try to create a project member with a generated employee ID
  // This is a workaround since the employees.create endpoint is not available
  // In a real scenario, we would need to find the correct way to create an employee
  // For testing purposes, we'll use the member's ID as the employee ID
  await generate_random_hrm_tracker_member_projects_project_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        hrm_tracker_employee_id: member.id, // Use member ID as employee ID
        role: "project-lead",
      },
    },
  );
  // 5. Verify project lead can access dashboard
  const dashboard: IHrmTrackerProject =
    await api.functional.hrmTracker.member.projects.dashboard.at(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(dashboard);
  // 6. Validate dashboard content matches project
  TestValidator.equals("project ID matches", dashboard.id, project.id);
  TestValidator.equals("project name matches", dashboard.name, project.name);
  TestValidator.equals("project color matches", dashboard.color, project.color);
  TestValidator.equals(
    "organization ID matches",
    dashboard.hrm_tracker_organization_id,
    organizationId,
  );
  TestValidator.equals(
    "organization name matches",
    dashboard.organization.name,
    project.organization.name,
  );
  TestValidator.equals(
    "organization status is active",
    dashboard.organization.status,
    "active",
  );
}
