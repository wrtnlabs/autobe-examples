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

export async function test_api_timer_discard_enables_new_timer(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register a new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Login again to get updated member profile with employee record
  const refreshed = await authorize_member_login(memberConnection, {
    body: {
      email,
      password,
    } as IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(refreshed);
  const employeeId = refreshed.employees[0]!.id;
  // 4. Create two projects
  const projectA =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(projectA);
  const projectB =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(projectB);
  // 5. Add the employee as project member for both projects
  const projectAMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member",
        },
        params: {
          projectId: projectA.id,
        },
      },
    );
  typia.assert(projectAMember);
  const projectBMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member",
        },
        params: {
          projectId: projectB.id,
        },
      },
    );
  typia.assert(projectBMember);
  // 6. Start a timer on Project A
  const timerA = await generate_random_hrm_time_tracking_member_timers_start(
    memberConnection,
    {
      body: {
        projectId: projectA.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timerA);
  TestValidator.equals("timer A status", timerA.status, "running");
  TestValidator.equals("timer A project id", timerA.project.id, projectA.id);
  // 7. Attempt to start a second timer on Project B — should fail
  await TestValidator.httpError(
    "second timer blocked while one is running",
    409,
    async () =>
      await generate_random_hrm_time_tracking_member_timers_start(
        memberConnection,
        {
          body: {
            projectId: projectB.id,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      ),
  );
  // 8. Discard the timer on Project A
  await api.functional.hrmTimeTracking.member.timers.erase(memberConnection, {
    timerId: timerA.id,
  });
  // 9. Start a new timer on Project B — should succeed after discard
  const timerB = await generate_random_hrm_time_tracking_member_timers_start(
    memberConnection,
    {
      body: {
        projectId: projectB.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timerB);
  TestValidator.equals("timer B status", timerB.status, "running");
  TestValidator.equals("timer B project id", timerB.project.id, projectB.id);
  TestValidator.predicate(
    "timer B started_at is set",
    () => timerB.started_at !== null && timerB.started_at !== undefined,
  );
}
