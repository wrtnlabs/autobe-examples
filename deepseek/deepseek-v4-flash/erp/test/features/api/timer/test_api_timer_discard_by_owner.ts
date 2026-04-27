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
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timers_start } from "../../../generate/generate_random_hrm_time_tracking_member_timers_start";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timer } from "../../../prepare/prepare_random_hrm_time_tracking_timer";

export async function test_api_timer_discard_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connection for the member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register a new member (join) and authenticate
  const email = "test_" + RandomGenerator.alphaNumeric(8) + "@test.com";
  const password = RandomGenerator.alphaNumeric(8) + "!Aa";
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(joinResult);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project in 'active' status
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 4. Get the employee_id by re-authenticating (login) to get updated IAuthorized with employees
  const loginResult = await authorize_member_login(memberConnection, {
    body: {
      email: joinResult.email,
      password,
      href: "",
      referrer: "",
    },
  });
  typia.assert(loginResult);
  const employeeId = loginResult.employees[0].id;
  // 5. Add the member (as employee) to the project as a member
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 6. Start a timer on the created project
  const timer = await generate_random_hrm_time_tracking_member_timers_start(
    memberConnection,
    {
      body: {
        projectId: project.id satisfies string,
      },
    },
  );
  typia.assert(timer);
  // 7. Discard the timer (target operation)
  // The erase function returns void, so we cannot assert the response
  await api.functional.hrmTimeTracking.member.timers.erase(memberConnection, {
    timerId: timer.id,
  });
  // 8. Validate that a new timer can be started on the same project (proving the session was terminated)
  const newTimer = await generate_random_hrm_time_tracking_member_timers_start(
    memberConnection,
    {
      body: {
        projectId: project.id satisfies string,
      },
    },
  );
  typia.assert(newTimer);
  TestValidator.equals(
    "new timer status is running",
    newTimer.status,
    "running",
  );
}