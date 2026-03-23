import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
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
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";

export async function test_api_task_creation_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmTrackerMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(member);
  // Create organization and join as member
  const memberOrgConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      memberOrgConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // Refresh authorization after joining organization
  const refreshedMemberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const refreshedMember: IHrmTrackerMember.IAuthorized =
    await authorize_member_login(refreshedMemberConnection, {
      body: {
        email: member.email,
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://example.com",
      },
    });
  typia.assert(refreshedMember);
  // Create project
  const projectConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: refreshedMember.token.access,
    },
  };
  const project = await generate_random_hrm_tracker_member_projects_create(
    projectConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // Assign member as project-lead to project
  const projectLeadConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: refreshedMember.token.access,
    },
  };
  const employee = refreshedMember.id;
  const projectMember =
    await generate_random_hrm_tracker_member_projects_project_members_create(
      projectLeadConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_tracker_employee_id: employee,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember);
  TestValidator.equals(
    "role is project-lead",
    projectMember.role,
    "project-lead",
  );
  // Create task as project-lead
  const taskConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: refreshedMember.token.access,
    },
  };
  const taskTitle = RandomGenerator.paragraph({ sentences: 1 });
  const task = await generate_random_hrm_tracker_member_projects_tasks_create(
    taskConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: taskTitle,
        status: "open",
        priority: "high",
      },
    },
  );
  typia.assert(task);
  // Validate task properties
  TestValidator.equals("project matches", task.project.id, project.id);
  TestValidator.equals("title matches", task.title, taskTitle);
  TestValidator.equals("status is open", task.status, "open");
  TestValidator.equals("priority is high", task.priority, "high");
}