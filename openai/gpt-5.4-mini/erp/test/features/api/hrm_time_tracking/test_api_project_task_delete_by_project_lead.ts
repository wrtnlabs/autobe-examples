import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_project_task_delete_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  const leadConnection: api.IConnection = { host: connection.host };
  const lead = await authorize_member_join(leadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(lead);
  const project = await api.functional.hrmTimeTracking.member.projects.create(
    leadConnection,
    {
      body: {
        name: `Lead Project ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: `#${RandomGenerator.alphaNumeric(6)}`,
        status: "active",
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const assigned =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      leadConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          pageSize: 50,
        } satisfies IHrmTimeTrackingProjectMembership.IRequest,
      },
    );
  typia.assert(assigned);
  TestValidator.predicate(
    "project member list should not be empty",
    assigned.data.length > 0,
  );
  const task =
    await api.functional.hrmTimeTracking.member.projects.tasks.create(
      leadConnection,
      {
        projectId: project.id,
        body: {
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: RandomGenerator.pick(["low", "medium", "high"] as const),
          assignedEmployeeId: assigned.data[0].employee.id,
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(task);
  await api.functional.hrmTimeTracking.member.projects.tasks.erase(
    leadConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
  await TestValidator.error(
    "deleted task should not be deletable again",
    async () => {
      await api.functional.hrmTimeTracking.member.projects.tasks.erase(
        leadConnection,
        {
          projectId: project.id,
          taskId: task.id,
        },
      );
    },
  );
}
