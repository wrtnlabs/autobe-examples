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
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timers_start } from "../../../generate/generate_random_hrm_time_tracking_member_timers_start";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timer } from "../../../prepare/prepare_random_hrm_time_tracking_timer";

/**
 * Test that an employee cannot start a second timer while another timer is already running.
 *
 * Validates the business rule from the time tracking system that enforces at most one active timer per employee. An employee who already has a timer in 'running' status must stop or discard it before starting a new timer session.
 *
 * The test follows the natural workflow: member registration → project creation → project member addition → first timer start (succeeds) → second timer start (rejected with error).
 *
 * 1. Authenticate as a member via POST /hrmTimeTracking/auth/member/join.
 * 2. Create a project via POST /hrmTimeTracking/member/projects.
 * 3. Add the authenticated employee as a project member via POST /hrmTimeTracking/member/projects/{projectId}/members.
 * 4. Start the first timer via POST /hrmTimeTracking/member/timers - should succeed.
 * 5. Attempt to start a second timer via POST /hrmTimeTracking/member/timers - should be rejected.
 */
export async function test_api_timer_multiple_active_timers_blocked(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Member authentication
  //----
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const employeeId = authorized.employees[0].id;
  //----
  // 2. Project creation
  //----
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  //----
  // 3. Add employee as project member
  //----
  const projectMember: IHrmTimeTrackingProjectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employeeId,
          role: "member" as const,
        },
      },
    );
  typia.assert(projectMember);
  //----
  // 4. Start the first timer (should succeed)
  //----
  const firstTimer: IHrmTimeTrackingTimer =
    await generate_random_hrm_time_tracking_member_timers_start(
      memberConnection,
      {
        body: {
          projectId: project.id,
        },
      },
    );
  typia.assert(firstTimer);
  TestValidator.equals("first timer is running", firstTimer.status, "running");
  //----
  // 5. Attempt to start a second timer (should be rejected)
  //----
  await TestValidator.error(
    "second timer should be rejected when one is already running",
    async () => {
      await generate_random_hrm_time_tracking_member_timers_start(
        memberConnection,
        {
          body: {
            projectId: project.id,
          },
        },
      );
    },
  );
}
