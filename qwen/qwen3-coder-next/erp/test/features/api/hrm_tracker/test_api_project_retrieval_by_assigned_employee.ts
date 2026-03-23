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
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";

export async function test_api_project_retrieval_by_assigned_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmTrackerMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create organization
  const org: IHrmTrackerOrganization =
    await generate_random_hrm_tracker_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(org);
  // 3. Create project
  const project: IHrmTrackerProject =
    await generate_random_hrm_tracker_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(2),
        color: "#FF5733",
        description: RandomGenerator.content({ paragraphs: 1 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1000>
        >(),
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IHrmTrackerProject.ICreate,
    });
  typia.assert(project);
  // 4. Assign member as employee to project
  const projectMember: IHrmTrackerProjectMember =
    await generate_random_hrm_tracker_member_projects_project_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_tracker_employee_id: member.id,
          role: "member" as const,
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Retrieve project as assigned employee
  const retrievedProject: IHrmTrackerProject =
    await api.functional.hrmTracker.member.projects.at(memberConnection, {
      projectId: project.id,
    });
  typia.assert(retrievedProject);
  // 6. Validate project details
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    project.name,
  );
  TestValidator.equals(
    "project color matches",
    retrievedProject.color,
    project.color,
  );
  TestValidator.equals(
    "project description matches",
    retrievedProject.description,
    project.description,
  );
  TestValidator.equals(
    "project status matches",
    retrievedProject.status,
    "active",
  );
  TestValidator.equals(
    "project budget_hours matches",
    retrievedProject.budget_hours,
    project.budget_hours,
  );
  TestValidator.equals(
    "project start_date matches",
    retrievedProject.start_date,
    project.start_date,
  );
  TestValidator.equals(
    "project end_date matches",
    retrievedProject.end_date,
    project.end_date,
  );
  TestValidator.equals(
    "organization matches",
    retrievedProject.organization.id,
    org.id,
  );
}
