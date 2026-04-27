import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

/**
 * Test that an active project can be successfully archived.
 *
 * Validates the project lifecycle transition from "active" to "archived" status. A member authenticates, creates a project (which defaults to "active"), then transitions it to "archived" via the dedicated status update endpoint. After the transition, verifies that existing project data including members, tasks, timelogs, and timers are all preserved in the response.
 *
 * 1. Member registers and authenticates via the join endpoint.
 * 2. Member creates a new project with name and color code.
 * 3. Validates the project defaults to "active" status.
 * 4. Changes project status to "archived".
 * 5. Validates the project status changed to "archived".
 * 6. Validates existing project data (members, tasks, timelogs, timers) is preserved.
 */
export async function test_api_project_status_change_to_archived(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an active project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 3. Verify project defaults to "active" status
  TestValidator.equals("project status is active", project.status, "active");
  // 4. Change project status to "archived"
  const updatedProject =
    await api.functional.hrmTimeTracking.member.projects.status.update(
      memberConnection,
      {
        projectId: project.id,
        body: { status: "archived" } satisfies IHrmTimeTrackingProject.IUpdate,
      },
    );
  typia.assert(updatedProject);
  // 5. Verify status changed to "archived"
  TestValidator.equals(
    "project status changed to archived",
    updatedProject.status,
    "archived",
  );
  // 6. Verify existing data is preserved
  TestValidator.equals("project id preserved", updatedProject.id, project.id);
  TestValidator.equals(
    "project name preserved",
    updatedProject.name,
    project.name,
  );
  TestValidator.equals(
    "project members preserved",
    updatedProject.projectMembers.length,
    project.projectMembers.length,
  );
  TestValidator.equals(
    "project tasks preserved",
    updatedProject.tasks.length,
    project.tasks.length,
  );
  TestValidator.equals(
    "project timelogs preserved",
    updatedProject.timelogs.length,
    project.timelogs.length,
  );
  TestValidator.equals(
    "project timers preserved",
    updatedProject.timers.length,
    project.timers.length,
  );
}
