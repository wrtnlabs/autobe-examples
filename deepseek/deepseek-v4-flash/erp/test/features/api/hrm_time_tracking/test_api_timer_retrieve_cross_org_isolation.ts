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

export async function test_api_timer_retrieve_cross_org_isolation(
  connection: api.IConnection,
): Promise<void> {
  //----------------------------------------------------------------
  // 1. Register a member with controlled credentials
  //----------------------------------------------------------------
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Create a dedicated member connection, separate from base connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies DeepPartial<IHrmTimeTrackingMember.IJoin>,
  });
  typia.assert(authorized);
  //----------------------------------------------------------------
  // 2. Create Organization A — member auto-becomes owner employee
  //----------------------------------------------------------------
  const orgA =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(orgA);
  //----------------------------------------------------------------
  // 3. Switch to Organization A context
  //----------------------------------------------------------------
  const switchedA =
    await api.functional.hrmTimeTracking.member._switch.organizations.change(
      memberConnection,
      {
        organizationId: orgA.id,
      },
    );
  typia.assert(switchedA);
  //----------------------------------------------------------------
  // 4. Re-login to obtain updated employee records (employee now exists)
  //----------------------------------------------------------------
  const loginConnection: api.IConnection = { host: connection.host };
  const reauthorized = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } as IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(reauthorized);
  // Find the employee record for Org A
  const employeeA = reauthorized.employees.find(
    (e) => e.role.organization.id === orgA.id,
  );
  if (employeeA === undefined) throw new Error("Employee in Org A not found.");
  typia.assert(employeeA);
  //----------------------------------------------------------------
  // 5. Create a project in Organization A
  //----------------------------------------------------------------
  const projectA =
    await generate_random_hrm_time_tracking_member_projects_create(
      loginConnection,
      {},
    );
  typia.assert(projectA);
  //----------------------------------------------------------------
  // 6. Add the employee as a project member
  //----------------------------------------------------------------
  const projectMemberA =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      loginConnection,
      {
        params: {
          projectId: projectA.id,
        },
        body: {
          employee_id: employeeA.id,
          role: "member" as const,
        },
      },
    );
  typia.assert(projectMemberA);
  //----------------------------------------------------------------
  // 7. Start a timer in Organization A
  //----------------------------------------------------------------
  const timerA = await generate_random_hrm_time_tracking_member_timers_start(
    loginConnection,
    {
      body: {
        projectId: projectA.id,
        description: "Cross-org isolation test timer",
      },
    },
  );
  typia.assert(timerA);
  //----------------------------------------------------------------
  // 8. Create Organization B — same member, new org, new employee record
  //----------------------------------------------------------------
  const orgB =
    await generate_random_hrm_time_tracking_member_organizations_create(
      loginConnection,
      {},
    );
  typia.assert(orgB);
  //----------------------------------------------------------------
  // 9. Switch to Organization B context
  //----------------------------------------------------------------
  const switchedB =
    await api.functional.hrmTimeTracking.member._switch.organizations.change(
      loginConnection,
      {
        organizationId: orgB.id,
      },
    );
  typia.assert(switchedB);
  //----------------------------------------------------------------
  // 10. Attempt to retrieve the timer from Org A while in Org B context
  //     → Expected: 404 Not Found (organization isolation)
  //----------------------------------------------------------------
  await TestValidator.httpError(
    "timer from different organization should return 404",
    404,
    async () => {
      await api.functional.hrmTimeTracking.member.timers.at(loginConnection, {
        timerId: timerA.id,
      });
    },
  );
}
