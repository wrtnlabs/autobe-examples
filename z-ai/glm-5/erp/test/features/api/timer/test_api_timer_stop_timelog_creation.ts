import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_stop_timelog_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Step 3: Assign the authenticated employee to the project as a project member
  // Note: The member becomes an employee (owner) of the organization upon join,
  // and member.id is used as employee reference in the test context
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: member.id,
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // Step 4: Start a timer associated with the project
  const timerDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: timerDescription,
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(timer);
  // Step 5: Wait for measurable duration (at least 1 minute as per scenario)
  await new Promise((resolve) => setTimeout(resolve, 65000));
  // Step 6: Stop the timer using the timerId from the start response
  const timelog = await api.functional.erpHrm.member.timers.stop(
    memberConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(timelog);
  // Step 7: Validate the timelog response
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals("timelog task is null", timelog.task, null);
  TestValidator.equals(
    "timelog description matches",
    timelog.description,
    timer.description,
  );
  TestValidator.equals(
    "timelog billable defaults to true",
    timelog.billable,
    true,
  );
  // Validate date is the date portion of the timer's started_at timestamp
  const timerStartedDate = timer.started_at.split("T")[0];
  const timelogDate = timelog.date.split("T")[0];
  TestValidator.equals(
    "timelog date matches timer start date",
    timelogDate,
    timerStartedDate,
  );
  // Validate duration is at least 1 minute (elapsed time rounded to nearest minute)
  TestValidator.predicate(
    "timelog duration is at least 1 minute",
    timelog.duration >= 1,
  );
}