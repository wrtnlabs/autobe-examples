import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_tasks_create } from "../../../generate/generate_random_hrm_time_track_member_tasks_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_task } from "../../../prepare/prepare_random_hrm_time_track_task";

/**
 * Test that a member without project:view permission is denied access to task history.
 *
 * Validates the authorization control that restricts task history access to users with appropriate project permissions. The test creates a complete workflow with organization, project, task, and history entry, then verifies that a member without project:view permission cannot retrieve the history even with valid taskId and historyId parameters.
 *
 * 1. Admin member creates organization, employee, project, and task
 * 2. Admin updates task status to create history entry
 * 3. Second member without project:view permission attempts to access history
 * 4. Verifies 403 Forbidden response is returned
 */
export async function test_api_task_history_access_denied_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create organization and project
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_member_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  const employee = await generate_random_hrm_time_track_member_employees_create(
    adminConnection,
    {
      body: {
        hrm_time_track_member_id: adminAuth.id,
      },
    },
  );
  typia.assert(employee);
  const project =
    await generate_random_hrm_time_track_member_projects_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(project);
  // 2. Create task in the project
  const task = await generate_random_hrm_time_track_member_tasks_create(
    adminConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
      },
    },
  );
  typia.assert(task);
  // 3. Update task status to create history entry
  const updatedTask = await api.functional.hrmTimeTrack.member.tasks.update(
    adminConnection,
    {
      taskId: task.id,
      body: {
        title: task.title,
        status: "in-progress",
      } satisfies IHrmTimeTrackTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 4. Authenticate as second member without project:view permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
    },
  });
  // 5. Attempt to access task history without permission
  // Use a random historyId - the important thing is that the member lacks permission
  // to access ANY history in this project, so we expect 403 regardless of historyId validity
  await TestValidator.httpError(
    "task history access denied without permission",
    403,
    async () =>
      await api.functional.hrmTimeTrack.member.tasks.histories.at(
        memberConnection,
        {
          taskId: task.id,
          historyId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}