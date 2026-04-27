import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

/**
 * Test Organization Owner's ability to view all employees' timelogs and employeeId filter scoping.
 *
 * Validates the `time:view_all` permission granted via the built-in Owner role. The Owner sees all timelogs across the organization by default, and can scope results to a specific employee using the employeeId filter. A non-existent employeeId returns empty results.
 *
 * Special attention is given to verifying that:
 * - The Owner role inherently grants all permissions including time:view_all
 * - Without employeeId filter, all employees' timelogs are returned
 * - With employeeId filter, only the specified employee's timelogs are returned
 * - A non-existent employeeId returns an empty result set (not an error)
 *
 * 1. Member A registers and creates an organization (becomes Owner).
 * 2. Member B registers with a different email.
 * 3. A custom role is created excluding time:view_all (only project:view, employee:view).
 * 4. A project is created, and B is invited with the custom role (auto-creates employee for B).
 * 5. B is added as a project member (employee ID extracted from response).
 * 6. B switches to the organization context and creates 2 timelogs.
 * 7. A is added as a project member (employee ID extracted from response).
 * 8. A creates 1 timelog.
 * 9. As Owner, query timelogs without filters -> 3 records (all employees).
 * 10. As Owner, query timelogs with B's employeeId -> 2 records (only B's timelogs).
 * 11. As Owner, query timelogs with non-existent employeeId -> 0 records.
 */
export async function test_api_timelog_list_owner_view_all_with_employee_filter(
  connection: api.IConnection,
): Promise<void> {
  // ---- Step 1: Register Member A (Owner) and create organization ----
  // 1.1 Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_1234",
      display_name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAAuthorized);
  // 1.2 Create organization -> A becomes Owner
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 1.3 Switch A to the new organization context
  const switchedOrgA =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberAConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switchedOrgA);
  // ---- Step 2: Register Member B (Employee without time:view_all) ----
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: "test_password_5678",
      display_name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberBAuthorized);
  // ---- Step 3: Create custom role excluding time:view_all ----
  const customRole =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: "TimeLogger",
          permissions: ["project:view", "employee:view"],
        },
      },
    );
  typia.assert(customRole);
  // ---- Step 4: Create a project ----
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {},
    );
  typia.assert(project);
  // ---- Step 5: Invite member B with the custom role (auto-creates employee for B) ----
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: memberBEmail,
          role_id: customRole.id,
        },
      },
    );
  typia.assert(invitation);
  // ---- Step 6: Add member B as a project member ----
  // First, switch B to the organization context
  const switchedOrgB =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberBConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switchedOrgB);
  // Add B as project member - the response contains B's employee info
  const projectMemberB =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberAConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: invitation.acceptor!.id,
          role: "member" as const,
        },
      },
    );
  typia.assert(projectMemberB);
  // Extract B's employee ID from the project member creation response
  // IHrmTimeTrackingProjectMember.employee.id contains the employee's UUID
  const bEmployeeId: string = projectMemberB.employee.id;
  // ---- Step 7: B creates 2 timelogs ----
  const timelogB1 =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberBConnection,
      {
        body: {
          project_id: project.id,
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 60,
          description: "B's first timelog",
          billable: true,
        },
      },
    );
  typia.assert(timelogB1);
  const timelogB2 =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberBConnection,
      {
        body: {
          project_id: project.id,
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 120,
          description: "B's second timelog",
          billable: true,
        },
      },
    );
  typia.assert(timelogB2);
  // ---- Step 8: Add A as project member and create 1 timelog ----
  // Switch A to organization context
  const switchedOrgA2 =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberAConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switchedOrgA2);
  // Invitation.acceptor has the member ID, not employee ID. We need A's employee ID.
  // Since A is the owner, A's employee was auto-created when the org was created.
  // The employee should be findable in memberAAuthorized.employees.
  const aEmployeeSummary = memberAAuthorized.employees.find(
    (emp) => emp.role.organization.id === organization.id,
  );
  if (aEmployeeSummary === undefined)
    throw new Error("A's employee record not found in join response");
  // Add A as project member too (needed to create timelogs)
  const projectMemberA =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberAConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: aEmployeeSummary.id,
          role: "member" as const,
        },
      },
    );
  typia.assert(projectMemberA);
  // A creates 1 timelog
  const timelogA =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberAConnection,
      {
        body: {
          project_id: project.id,
          date: new Date().toISOString(),
          duration_minutes: 90,
          description: "A's timelog",
          billable: true,
        },
      },
    );
  typia.assert(timelogA);
  // ---- Test A: No employeeId filter - Owner sees all 3 timelogs ----
  const allTimelogs =
    await api.functional.hrmTimeTracking.member.timelogs.index(
      memberAConnection,
      {
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(allTimelogs);
  TestValidator.equals(
    "Owner sees all timelogs without filter",
    allTimelogs.pagination.records,
    3,
  );
  TestValidator.predicate("data contains timelogs from both employees", () => {
    const employeeIds = new Set(allTimelogs.data.map((t) => t.employee.id));
    return employeeIds.has(aEmployeeSummary.id) && employeeIds.has(bEmployeeId);
  });
  // ---- Test B: With employeeId filter - scope to B's timelogs ----
  const bTimelogs = await api.functional.hrmTimeTracking.member.timelogs.index(
    memberAConnection,
    {
      body: {
        employeeId: bEmployeeId,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(bTimelogs);
  TestValidator.equals(
    "Owner sees only B's timelogs with employeeId filter",
    bTimelogs.pagination.records,
    2,
  );
  TestValidator.predicate("all returned timelogs belong to employee B", () =>
    bTimelogs.data.every((t) => t.employee.id === bEmployeeId),
  );
  TestValidator.predicate("A's timelog is not included", () =>
    bTimelogs.data.every((t) => t.employee.id !== aEmployeeSummary.id),
  );
  // ---- Test C: With non-existent employeeId - empty results ----
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.hrmTimeTracking.member.timelogs.index(
      memberAConnection,
      {
        body: {
          employeeId: nonExistentId,
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "Owner sees 0 timelogs with non-existent employeeId",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("data is empty array", emptyResult.data.length, 0);
}
