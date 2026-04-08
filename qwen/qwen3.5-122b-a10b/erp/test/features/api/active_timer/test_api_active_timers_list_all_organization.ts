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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmActiveTimer";
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
 * Test retrieving all active timer sessions in the organization without any filters.
 *
 * Validates the primary success path for viewing organizational time tracking activity through the active timers index endpoint. Ensures that active timers are properly returned with all required relationship data including employee, project, and task information.
 *
 * 1. Authenticate as member via join operation
 * 2. Create a project in the organization
 * 3. Assign an employee to the project (employee must be a member of the organization)
 * 4. Start an active timer for the employee on the project
 * 5. Call the active-timers index endpoint with empty request body
 * 6. Verify response contains the created timer in the data array
 * 7. Verify pagination metadata is correct (current=1, limit defaults, records=1, pages=1)
 * 8. Verify timer summary includes: id, start_timestamp, description, employee (with id, position, employment_type, status, user, organization, role), project (with id, name, color_code, status, organization), task (null if not specified)
 */
export async function test_api_active_timers_list_all_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  // Get organization ID from member's organizations
  const organizationId = memberAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("No organization found for member");
  }
  // 2. Create project
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 3. Create employee member and assign to project
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // Generate employee ID for project membership (in simulation mode, this will be validated)
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: { projectId: project.id },
      body: {
        employee_id: employeeId,
        role: RandomGenerator.pick(["member", "project-lead"] as const),
      } satisfies IHrmProjectMember.ICreate,
    });
  typia.assert(projectMember);
  // 4. Start active timer (as the employee)
  const timer = await generate_random_hrm_member_active_timers_create(
    employeeConnection,
    {
      body: {
        projectId: project.id,
      } satisfies IHrmActiveTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 5. Call the active-timers index endpoint
  const activeTimers = await api.functional.hrm.member.active_timers.index(
    memberConnection,
    {
      body: {} satisfies IHrmActiveTimer.IRequest,
    },
  );
  typia.assert(activeTimers);
  // 6. Verify response contains the created timer
  TestValidator.equals("timer count", activeTimers.data.length, 1);
  TestValidator.equals("timer id matches", activeTimers.data[0]?.id, timer.id);
  // 7. Verify timer structure
  const retrievedTimer = activeTimers.data[0];
  TestValidator.predicate(
    "has start timestamp",
    retrievedTimer?.start_timestamp !== null,
  );
  TestValidator.predicate("has employee", retrievedTimer?.employee !== null);
  TestValidator.predicate("has project", retrievedTimer?.project !== null);
  TestValidator.predicate(
    "employee has id",
    retrievedTimer?.employee?.id !== null,
  );
  TestValidator.predicate(
    "employee has position",
    retrievedTimer?.employee?.position !== null,
  );
  TestValidator.predicate(
    "employee has employment_type",
    retrievedTimer?.employee?.employment_type !== null,
  );
  TestValidator.predicate(
    "employee has status",
    retrievedTimer?.employee?.status !== null,
  );
  TestValidator.predicate(
    "employee has user",
    retrievedTimer?.employee?.user !== null,
  );
  TestValidator.predicate(
    "employee has organization",
    retrievedTimer?.employee?.organization !== null,
  );
  TestValidator.predicate(
    "employee has role",
    retrievedTimer?.employee?.role !== null,
  );
  TestValidator.predicate(
    "project has id",
    retrievedTimer?.project?.id !== null,
  );
  TestValidator.predicate(
    "project has name",
    retrievedTimer?.project?.name !== null,
  );
  TestValidator.predicate(
    "project has color_code",
    retrievedTimer?.project?.color_code !== null,
  );
  TestValidator.predicate(
    "project has status",
    retrievedTimer?.project?.status !== null,
  );
  TestValidator.predicate(
    "project has organization",
    retrievedTimer?.project?.organization !== null,
  );
  // 8. Verify pagination metadata
  TestValidator.equals("current page", activeTimers.pagination.current, 1);
  TestValidator.predicate("has records", activeTimers.pagination.records > 0);
  TestValidator.predicate("has pages", activeTimers.pagination.pages > 0);
  TestValidator.equals("records count", activeTimers.pagination.records, 1);
  TestValidator.equals("pages count", activeTimers.pagination.pages, 1);
}
