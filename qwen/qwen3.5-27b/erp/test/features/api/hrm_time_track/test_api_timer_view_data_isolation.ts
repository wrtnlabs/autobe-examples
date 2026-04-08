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
import type { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
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
import { generate_random_hrm_time_track_member_timers_create } from "../../../generate/generate_random_hrm_time_track_member_timers_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_timer } from "../../../prepare/prepare_random_hrm_time_track_timer";

/**
 * Test that an employee cannot view another employee's timer session, enforcing data isolation.
 *
 * Validates that the system properly enforces authorization boundaries between employees within the same organization. The test creates two separate employee accounts in the same organization, starts a timer as employee A, and then attempts to access that timer using employee B's credentials. The system must reject the unauthorized access attempt with an appropriate error response.
 *
 * This test ensures that the authorization check in the timer retrieval endpoint correctly verifies that the requesting employee's ID matches the timer's hrm_time_track_employee_id, preventing unauthorized employees from viewing each other's time tracking data.
 *
 * 1. Register and authenticate as member A (employee A)
 * 2. Create an organization for both employees
 * 3. Create employee A record in the organization
 * 4. Create a project within the organization
 * 5. Start a timer for employee A with the project
 * 6. Register and authenticate as member B (employee B)
 * 7. Create employee B record in the same organization
 * 8. As employee B, attempt to view employee A's timer
 * 9. Verify the operation fails with an authorization error
 */
export async function test_api_timer_view_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member A (employee A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: `employee_a_${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "password123",
    },
  });
  typia.assert(memberAAuth);
  // 2. Create an organization for both employees
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee A record in the organization
  const employeeA =
    await generate_random_hrm_time_track_member_employees_create(
      memberAConnection,
      {
        body: {
          hrm_time_track_member_id: memberAAuth.id,
          position: "Software Developer",
          employment_type: "full-time",
          hire_date: new Date().toISOString(),
        },
      },
    );
  typia.assert(employeeA);
  // 4. Create a project within the organization
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 5. Start a timer for employee A with the project
  const timerA = await generate_random_hrm_time_track_member_timers_create(
    memberAConnection,
    {
      body: {
        project_id: project.id,
        description: "Working on feature implementation",
      },
    },
  );
  typia.assert(timerA);
  // 6. Register and authenticate as member B (employee B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: `employee_b_${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "password123",
    },
  });
  typia.assert(memberBAuth);
  // 7. Create employee B record in the same organization
  const employeeB =
    await generate_random_hrm_time_track_member_employees_create(
      memberBConnection,
      {
        body: {
          hrm_time_track_member_id: memberBAuth.id,
          position: "QA Engineer",
          employment_type: "full-time",
          hire_date: new Date().toISOString(),
        },
      },
    );
  typia.assert(employeeB);
  // 8. As employee B, attempt to view employee A's timer
  // This should fail with an authorization error
  await TestValidator.error(
    "employee B cannot view employee A's timer",
    async () => {
      await api.functional.hrmTimeTrack.member.timers.at(memberBConnection, {
        timerId: timerA.id,
      });
    },
  );
}
