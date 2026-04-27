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
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_timelog_create_basic(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account (creates employee record)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const employeeId: string = authorized.employees[0]!.id;
  // Step 2: Create an active project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // Step 3: Add the authenticated employee as a project member with role 'member'
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
  // Step 4: Create a timelog
  const description: string = RandomGenerator.paragraph({ sentences: 2 });
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date().toISOString(),
          duration_minutes: 60,
          project_id: project.id,
          description: description,
          billable: true,
        },
      },
    );
  typia.assert(timelog);
  // Step 5: Validate the timelog response
  TestValidator.equals("duration minutes", timelog.durationMinutes, 60);
  TestValidator.equals("description matches", timelog.description, description);
  TestValidator.equals("billable defaults to true", timelog.billable, true);
  TestValidator.equals("employee matches", timelog.employee.id, employeeId);
  TestValidator.equals("project matches", timelog.project.id, project.id);
  TestValidator.predicate("task is null", timelog.task === null);
  TestValidator.predicate("timesheet is null", timelog.timesheet === null);
  TestValidator.predicate("id is present", typeof timelog.id === "string");
  TestValidator.predicate(
    "createdAt is present",
    typeof timelog.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt is present",
    typeof timelog.updatedAt === "string",
  );
}
