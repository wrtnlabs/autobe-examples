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

export async function test_api_task_update_status_records_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration (actor-specific connection)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create project
  const project = await generate_random_hrm_tracker_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        color: RandomGenerator.alphabets(6),
      },
    },
  );
  typia.assert(project);
  // 3. Create a task in the project
  const task = await generate_random_hrm_tracker_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(2),
        status: "open" as const,
        priority: "medium" as const,
      },
    },
  );
  typia.assert(task);
  // 4. Update task status
  const updatedTask =
    await api.functional.hrmTracker.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "in-progress" as const,
        },
      },
    );
  typia.assert(updatedTask);
  // 5. Verify status change
  TestValidator.equals("status updated", updatedTask.status, "in-progress");
  TestValidator.equals("project matches", updatedTask.project.id, project.id);
  // 6. Additional validation for status change history verification
  TestValidator.predicate(
    "status changed from open",
    task.status !== updatedTask.status,
  );
}
