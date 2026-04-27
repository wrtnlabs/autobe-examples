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
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_timelog_update_description_and_duration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and obtain auth token
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create an active project within the organization
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // Step 4: Add the authenticated employee as a project member with 'member' role
  const employeeId = authorized.employees[0].id;
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
  // Step 5: Create an initial timelog against the project
  const originalDescription = RandomGenerator.paragraph({ sentences: 2 });
  const originalDuration = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<120>
  >();
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          description: originalDescription,
          duration_minutes: originalDuration,
          date: new Date().toISOString(),
        },
      },
    );
  typia.assert(timelog);
  // Step 6: Update the timelog with new description and duration
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newDuration = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<180>
  >();
  const updatedTimelog =
    await api.functional.hrmTimeTracking.member.timelogs.update(
      memberConnection,
      {
        timelogId: timelog.id,
        body: {
          description: newDescription,
          duration_minutes: newDuration,
        } satisfies IHrmTimeTrackingTimelog.IUpdate,
      },
    );
  typia.assert(updatedTimelog);
  // Step 7: Validate the updated timelog
  TestValidator.equals(
    "description should be updated",
    updatedTimelog.description,
    newDescription,
  );
  TestValidator.equals(
    "durationMinutes should be updated",
    updatedTimelog.durationMinutes,
    newDuration,
  );
  TestValidator.predicate(
    "updatedAt should be after createdAt",
    () =>
      new Date(updatedTimelog.updatedAt).getTime() >
      new Date(updatedTimelog.createdAt).getTime(),
  );
}
