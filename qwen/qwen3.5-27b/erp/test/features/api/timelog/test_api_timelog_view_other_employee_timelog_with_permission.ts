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
 * Test that a user with time:view_all permission can retrieve another employee's timelog.
 *
 * Validates the permission-based access control for timelog viewing across employees within the same organization. Ensures that users with the time:view_all permission can access timelogs created by other employees, while maintaining organization isolation.
 *
 * The test creates a complete organizational structure with two employees, a project, and a timelog. It then verifies that employee A (with time:view_all permission) can successfully retrieve employee B's timelog, confirming that the permission system correctly grants cross-employee access while preserving data integrity and relationships.
 *
 * 1. Register and authenticate as employee A with time:view_all permission
 * 2. Create an organization to provide context for all entities
 * 3. Create employee A record linked to the organization
 * 4. Register and authenticate as employee B
 * 5. Create employee B record linked to the same organization
 * 6. Create a project within the organization
 * 7. Assign employee B as a project member
 * 8. Create a timelog for employee B on that project
 * 9. Authenticate as employee A and retrieve employee B's timelog
 * 10. Validate the response contains correct employee, project, and timelog data
 */
export async function test_api_timelog_view_other_employee_timelog_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as employee A
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeAAuth = await authorize_member_join(employeeAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(employeeAAuth);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      employeeAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee A record
  const employeeA =
    await generate_random_hrm_time_track_member_employees_create(
      employeeAConnection,
      {
        body: {
          hrm_time_track_member_id: employeeAAuth.id,
          position: "Senior Developer",
          employment_type: "full-time",
          hire_date: new Date().toISOString(),
          status: "active",
        } satisfies IHrmTimeTrackEmployee.ICreate,
      },
    );
  typia.assert(employeeA);
  // 4. Register and authenticate as employee B
  const employeeBConnection: api.IConnection = { host: connection.host };
  const employeeBAuth = await authorize_member_join(employeeBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(employeeBAuth);
  // 5. Create employee B record (linked to same organization via employeeAConnection)
  const employeeB =
    await generate_random_hrm_time_track_member_employees_create(
      employeeAConnection,
      {
        body: {
          hrm_time_track_member_id: employeeBAuth.id,
          position: "Junior Developer",
          employment_type: "full-time",
          hire_date: new Date().toISOString(),
          status: "active",
        } satisfies IHrmTimeTrackEmployee.ICreate,
      },
    );
  typia.assert(employeeB);
  // 6. Create a project within the organization
  const project = await generate_random_hrm_time_track_member_projects_create(
    employeeAConnection,
    {},
  );
  typia.assert(project);
  // 7. Assign employee B to the project
  const projectMember =
    await generate_random_hrm_time_track_member_projects_members_create(
      employeeAConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: employeeB.id,
          role: "member",
        } satisfies IHrmTimeTrackProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 8. Create a timelog for employee B (using employeeBConnection)
  const timelog = await generate_random_hrm_time_track_member_timelogs_create(
    employeeBConnection,
    {
      body: {
        date: new Date().toISOString(),
        duration_seconds: 3600,
        hrm_time_track_project_id: project.id,
        billable: true,
        notes: "Working on feature implementation",
      } satisfies IHrmTimeTrackTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 9. Retrieve employee B's timelog using employee A's connection (with time:view_all permission)
  const retrievedTimelog = await api.functional.hrmTimeTrack.member.timelogs.at(
    employeeAConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 10. Validate the response
  TestValidator.equals("timelog id matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "employee is employee B",
    retrievedTimelog.employee.id,
    employeeB.id,
  );
  TestValidator.equals(
    "project matches",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.predicate(
    "duration_seconds is positive",
    retrievedTimelog.duration_seconds > 0,
  );
  TestValidator.equals(
    "billable status matches",
    retrievedTimelog.billable,
    true,
  );
}
