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

/**
 * Test retrieving a running timer by its unique identifier after completing the full setup chain.
 *
 * Validates the complete workflow from member registration through organization creation, project setup, project membership, timer start, and timer retrieval. Ensures that a running timer can be retrieved by ID with all fields correctly populated.
 *
 * Special attention is given to verifying that the timer's status is 'running', started_at is a valid timestamp, stopped_at is null (timer still running), employee and project references are non-null and correctly linked, task is null (no task specified), and the description matches what was provided when starting the timer.
 *
 * 1. Register a new member account via authorize_member_join.
 * 2. Create a new organization with USD currency, Asia/Seoul timezone, fiscal start month 1.
 * 3. Switch organization context to the newly created organization.
 * 4. Re-authenticate via authorize_member_login to obtain the employee record (auto-created as Owner upon org creation).
 * 5. Create an active project with a name and color code.
 * 6. Add the authenticated employee as a project member with role 'member'.
 * 7. Start a timer against the project with a description.
 * 8. Retrieve the timer by its ID via GET /hrmTimeTracking/member/timers/{timerId}.
 * 9. Validate the retrieved timer matches expected values.
 */
export async function test_api_timer_retrieve_running(
  connection: api.IConnection,
): Promise<void> {
  // ---- Create actor-specific connection ----
  const memberConnection: api.IConnection = { host: connection.host };
  // ---- Step 1: Register a new member ----
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: displayName,
    },
  });
  typia.assert(joinResult);
  // ---- Step 2: Create an organization ----
  const org =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 satisfies number as number,
        },
      },
    );
  typia.assert(org);
  // ---- Step 3: Switch to the new organization ----
  const switchedOrg =
    await api.functional.hrmTimeTracking.member._switch.organizations.change(
      memberConnection,
      {
        organizationId: org.id,
      },
    );
  typia.assert(switchedOrg);
  // ---- Step 4: Re-login to get fresh IAuthorized with employees populated ----
  const loginResult = await authorize_member_login(memberConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResult);
  const employeeId = loginResult.employees[0].id;
  // ---- Step 5: Create a project ----
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // ---- Step 6: Add the employee as a project member ----
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employeeId,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // ---- Step 7: Start a timer ----
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_hrm_time_tracking_member_timers_start(
    memberConnection,
    {
      body: {
        projectId: project.id,
        description,
      },
    },
  );
  typia.assert(timer);
  // ---- Step 8: Retrieve the timer by ID ----
  const retrieved = await api.functional.hrmTimeTracking.member.timers.at(
    memberConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(retrieved);
  // ---- Step 9: Validate timer fields ----
  TestValidator.equals("timer id matches requested id", retrieved.id, timer.id);
  TestValidator.equals("timer status is running", retrieved.status, "running");
  TestValidator.predicate("started_at is valid ISO date-time", () => {
    const d = new Date(retrieved.started_at);
    return !isNaN(d.getTime());
  });
  TestValidator.equals("stopped_at is null", retrieved.stopped_at, null);
  TestValidator.notEquals("employee is non-null", retrieved.employee, null);
  TestValidator.notEquals("project is non-null", retrieved.project, null);
  TestValidator.equals("project id matches", retrieved.project.id, project.id);
  TestValidator.equals(
    "project name matches",
    retrieved.project.name,
    project.name,
  );
  TestValidator.equals("task is null", retrieved.task, null);
  TestValidator.equals(
    "description matches",
    retrieved.description,
    description,
  );
}
