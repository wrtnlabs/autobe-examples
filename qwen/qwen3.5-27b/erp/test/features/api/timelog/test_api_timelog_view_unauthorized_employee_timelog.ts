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
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
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
import { generate_random_hrm_time_track_member_projects_members_create } from "../../../generate/generate_random_hrm_time_track_member_projects_members_create";
import { generate_random_hrm_time_track_member_timelogs_create } from "../../../generate/generate_random_hrm_time_track_member_timelogs_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";
import { prepare_random_hrm_time_track_timelog } from "../../../prepare/prepare_random_hrm_time_track_timelog";

/**
 * Test that an employee without time:view_all permission cannot retrieve another employee's timelog.
 *
 * Validates the authorization boundary for timelog access between employees within the same organization. Ensures that employees can only view their own timelogs unless they have the time:view_all permission. The test creates two employees in the same organization, assigns them to a project, creates a timelog for one employee, and verifies that the other employee cannot access it.
 *
 * Special attention is given to verifying that the authorization check correctly identifies when a timelog belongs to a different employee and returns an appropriate 403 Forbidden error.
 *
 * 1. Register and authenticate as member A.
 * 2. Create an organization.
 * 3. Create employee A record (authenticated user without time:view_all).
 * 4. Register and authenticate as member B.
 * 5. Create employee B record (owner of the timelog).
 * 6. Create a project within the organization.
 * 7. Assign employee A to the project.
 * 8. Assign employee B to the project.
 * 9. Authenticate as employee B and create a timelog on the project.
 * 10. Authenticate as employee A and attempt to retrieve employee B's timelog.
 * 11. Verify that the request returns HTTP 403 Forbidden status.
 */
export async function test_api_timelog_view_unauthorized_employee_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee A record
  const employeeA =
    await generate_random_hrm_time_track_member_employees_create(
      memberAConnection,
      {},
    );
  typia.assert(employeeA);
  // 4. Register and authenticate as member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 5. Create employee B record
  const employeeB =
    await generate_random_hrm_time_track_member_employees_create(
      memberBConnection,
      {},
    );
  typia.assert(employeeB);
  // 6. Create a project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 7. Assign employee A to the project
  const projectMemberA =
    await generate_random_hrm_time_track_member_projects_members_create(
      memberAConnection,
      {
        params: { projectId: project.id },
        body: { employee_id: employeeA.id },
      },
    );
  typia.assert(projectMemberA);
  // 8. Assign employee B to the project
  const projectMemberB =
    await generate_random_hrm_time_track_member_projects_members_create(
      memberBConnection,
      {
        params: { projectId: project.id },
        body: { employee_id: employeeB.id },
      },
    );
  typia.assert(projectMemberB);
  // 9. Create a timelog as employee B
  const timelog = await generate_random_hrm_time_track_member_timelogs_create(
    memberBConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        date: new Date().toISOString(),
        duration_seconds: 3600,
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 10. Attempt to retrieve employee B's timelog as employee A (should fail with 403)
  await TestValidator.httpError(
    "unauthorized employee cannot access another employee's timelog",
    403,
    async () =>
      await api.functional.hrmTimeTrack.member.timelogs.at(memberAConnection, {
        timelogId: timelog.id,
      }),
  );
}
