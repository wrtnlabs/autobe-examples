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
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";

export async function test_api_task_status_update_denied_regular_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create project lead member and authenticate
  const leadConnection: api.IConnection = { host: connection.host };
  const leadMember = await authorize_member_join(leadConnection, {
    body: {
      email: `lead${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "12341234",
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create project as project lead
  const project = await api.functional.hrmTracker.member.projects.create(
    leadConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        color: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(project);
  // 3. Create regular member and authenticate
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await authorize_member_join(regularMemberConnection, {
    body: {
      email: `regular${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "12341234",
      display_name: RandomGenerator.name(),
    },
  });
  // 4. Assign regular member as 'member' role (not project-lead)
  const projectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      leadConnection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: regularMember.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 5. Project lead creates a task
  const task = await api.functional.hrmTracker.member.projects.tasks.create(
    leadConnection,
    {
      projectId: project.id,
      body: {
        title: RandomGenerator.name(2),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 6. Regular member attempts to update task status (should be denied)
  await TestValidator.error("regular member denied permission", async () => {
    await api.functional.hrmTracker.member.projects.tasks.taskHistories.update(
      regularMemberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "in-progress",
        },
      },
    );
  });
}
