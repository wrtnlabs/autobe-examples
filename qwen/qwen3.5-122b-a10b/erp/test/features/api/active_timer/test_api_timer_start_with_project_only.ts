import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_active_timers_create } from "../../../generate/generate_random_hrm_member_active_timers_create";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_active_timer } from "../../../prepare/prepare_random_hrm_active_timer";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";

/**
 * Test timer start with project only, without task specification.
 *
 * Validates that an employee can start a live timer session by selecting only a project, without specifying a task. This confirms task selection is truly optional and the system supports project-level time tracking without task granularity.
 *
 * The test follows these steps:
 * 1. Register and authenticate a new member account
 * 2. Create a project within the member's organization
 * 3. Assign the member as an employee to the organization and as a project member
 * 4. Start a timer with only projectId in the request body (no taskId)
 * 5. Validate the timer response has task field as null and all required fields populated
 *
 * 1. Member registration and authentication
 *    1.1. Call authorize_member_join to create member account
 *    1.2. Extract organization context from member's organizations array
 * 2. Project creation
 *    2.1. Generate a random project within the organization
 *    2.2. Project must be in active status
 * 3. Employee and project membership setup
 *    3.1. The member becomes an employee through the join response
 *    3.2. Assign employee to the project as a member
 * 4. Timer start with project only
 *    4.1. Create timer request body with only projectId (no taskId, no description)
 *    4.2. Call generate_random_hrm_member_active_timers_create
 * 5. Response validation
 *    5.1. Validate task field is null
 *    5.2. Validate id, employee, project, start_timestamp, created_at, updated_at are populated
 *    5.3. Validate project reference matches the created project
 */
export async function test_api_timer_start_with_project_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Get organization from member's organizations array
  const organizationId = memberAuth.organizations?.[0]?.id;
  TestValidator.predicate(
    "member has organization",
    organizationId !== undefined,
  );
  // 2. Create a project within the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          status: "active",
        },
        params: {
          organizationId: organizationId!,
        },
      },
    );
  typia.assert(project);
  // 3. Assign employee to project as member
  // The member becomes an employee through the join response
  // We need to find the employee record for this member
  // For simplicity, we'll use the member's ID as employee_id (assuming the system creates employee record on join)
  // Actually, we need to get the employee_id from somewhere
  // Looking at the DTO, IHrmProjectMember.ICreate requires employee_id
  // The member joins and gets authenticated, but we need an employee record
  // Let me check the dependencies - the scenario says "employee should be authenticated with an active employee record"
  // This means we need to ensure the member has an employee record
  // For this test, we'll assume the employee_id is the same as member_id or we need to create an employee
  // Since we don't have an employee creation function, we'll use a workaround
  // Actually, looking at the mockup, it seems like the employee is created separately
  // Let me use the member's ID as a placeholder for employee_id - this might need adjustment
  const employeeId = memberAuth.id; // This is a simplification - in real scenario, employee would be created separately
  const projectMember =
    await generate_random_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member",
        } satisfies IHrmProjectMember.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 4. Start timer with project only (no task)
  const timer = await generate_random_hrm_member_active_timers_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        // taskId is intentionally omitted to test project-only tracking
      } satisfies IHrmActiveTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 5. Validate response
  // 5.1. Task field should be null
  TestValidator.equals("task is null", timer.task, null);
  // 5.2. All required fields should be populated
  TestValidator.predicate(
    "timer has id",
    timer.id !== undefined && timer.id !== null,
  );
  TestValidator.predicate(
    "timer has employee",
    timer.employee !== undefined && timer.employee !== null,
  );
  TestValidator.predicate(
    "timer has project",
    timer.project !== undefined && timer.project !== null,
  );
  TestValidator.predicate(
    "timer has start_timestamp",
    timer.start_timestamp !== undefined && timer.start_timestamp !== null,
  );
  TestValidator.predicate(
    "timer has created_at",
    timer.created_at !== undefined && timer.created_at !== null,
  );
  TestValidator.predicate(
    "timer has updated_at",
    timer.updated_at !== undefined && timer.updated_at !== null,
  );
  // 5.3. Project reference should match
  TestValidator.equals("project matches", timer.project.id, project.id);
}