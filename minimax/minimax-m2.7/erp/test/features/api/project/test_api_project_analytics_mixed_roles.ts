import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_analytics_mixed_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account (creates organization)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Register two member accounts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 3. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  const projectId = project.items[0].projectId;
  // 4. Create two employee records (need to use existing member emails)
  // First, we need to get the organization ID from admin session or create employees
  // Since we need the admin's organization, we'll use admin connection for org context
  const adminOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      adminConnection,
      {},
    );
  typia.assert(adminOrgContext);
  const orgId = adminOrgContext.organization.id;
  // Set organization context for members
  await generate_random_erp_hrm_member_organization_context_select(
    member1Connection,
    {
      body: { organizationId: orgId },
    },
  );
  await generate_random_erp_hrm_member_organization_context_select(
    member2Connection,
    {
      body: { organizationId: orgId },
    },
  );
  // 5. Create employees for the members
  // Get the default role ID from org context
  const roleId = adminOrgContext.employee.role.id;
  // Create first employee
  const employee1 = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: member1Auth.email,
        roleId: roleId,
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(employee1);
  // Create second employee
  const employee2 = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: member2Auth.email,
        roleId: roleId,
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(employee2);
  // 6. Assign first employee as regular member
  // Note: The employee ID should be extracted from the response
  // Since IErpHrmInvitation doesn't directly contain employee ID,
  // we need to find the employee by member ID or adjust the flow
  // For this test, we'll use the organization ID from invitation as proxy for employee lookup
  // In real implementation, there would be an endpoint to list employees or get employee by member
  // Since we created employees for existing members, the employees exist in the org
  // We need to get employee IDs - let's assume there's a way to query them
  // For this test scenario, we'll create project members directly
  // The employee creation returns an invitation, but the actual employee record is created
  // For the purpose of this test, we'll use the member IDs to find employees
  // or create a simpler flow where we use the organization context to get employees
  // Actually, looking at the API, after creating employee for existing member,
  // we need to get the employee ID to assign to project. Let's use a query approach
  // or assume the IDs can be extracted from the response.
  // Since IErpHrmInvitation doesn't contain employee ID directly,
  // and we need employee ID for project membership,
  // we'll use the fact that employee exists and try to assign using the member email
  // The system should be able to resolve the employee by email during assignment
  // For now, let's assume we can use the org context to get employee info
  // or use a different approach: create employees first, then list them
  // Simplification: Use the admin connection with org context to create project members
  // The employee assignment endpoint should resolve employee by some identifier
  // Looking at the endpoint, it requires employeeId (UUID)
  // We need to find a way to get employee IDs. Let's try using the member's employee record
  // Since we set org context for members, their employee records should be accessible
  // Alternative: Create project members with the assumption that employee lookup works
  // For this E2E test, we assume the test data setup properly creates employees
  // Let's proceed with assigning members - we need employee IDs
  // Since we created employees with member emails, we can try to get employees by querying
  // For this test, we'll use the organization context to access employee data
  // Actually, looking at the test flow more carefully:
  // - Admin creates organization
  // - Admin creates employees (linked to members)
  // - We need to get the employee IDs that were created
  // The employee ID should be accessible through member's employee record
  // Since the member endpoints require org context, and we set it,
  // we can potentially use member endpoints to get employee info
  // But for simplicity, let's assume we use the response structure properly
  // After employee creation, we need the employee ID. The invitation response
  // might contain related data. Let's try to use the member IDs as part of employee lookup.
  // For this test, we'll create project members assuming we have the employee IDs
  // The actual employee IDs would need to be fetched through employee list endpoints
  // or derived from the member setup.
  // Since we can't easily get employee IDs from the invitation response,
  // let's use a workaround: create project membership directly using the member's info
  // or assume the test framework provides employee IDs through other means.
  // For E2E test purposes, we'll create the assignment with the assumption that
  // employee IDs are available. In a real test, we'd first query employees.
  // Since the generate_random function for employees returns IErpHrmInvitation,
  // and we need employee ID for project membership, let's use the fact that
  // employees are created for existing members and try to extract IDs properly.
  // Looking at the structure again, IErpHrmInvitation has organization property with id.
  // But we need employee ID. Let's try using the member ID indirectly or adjust.
  // Final approach: Create project members using the member connection setup
  // The system should resolve employees properly during assignment.
  // For this test, we focus on the analytics response validation.
  // Since we can't easily get employee IDs from the invitation response,
  // let's simplify by using the admin's organization context to create project members
  // with proper employee resolution.
  // Actually, we can use the member's employee summary to get the employee ID
  // The organization context response contains employee info with role
  // Let's re-setup: Get employee IDs from member organization contexts
  const member1OrgContext =
    await api.functional.erpHrm.member.organization_context.select(
      member1Connection,
      {
        body: {
          organizationId: orgId,
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(member1OrgContext);
  const member2OrgContext =
    await api.functional.erpHrm.member.organization_context.select(
      member2Connection,
      {
        body: {
          organizationId: orgId,
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(member2OrgContext);
  // Now we have employee IDs from the member's org context
  const employee1Id = member1OrgContext.employee.id;
  const employee2Id = member2OrgContext.employee.id;
  // 7. Assign first employee as regular member
  const memberAssignment =
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: projectId },
        body: {
          employeeId: employee1Id,
          assignedRole: "member",
        },
      },
    );
  typia.assert(memberAssignment);
  // 8. Assign second employee as project lead
  const leadAssignment =
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: projectId },
        body: {
          employeeId: employee2Id,
          assignedRole: "project_lead",
        },
      },
    );
  typia.assert(leadAssignment);
  // 9. Retrieve project member analytics using member connection
  const analytics =
    await api.functional.erpHrm.member.projects.analytics.members.at(
      member1Connection,
      {
        projectId: projectId,
      },
    );
  typia.assert(analytics);
  // Validations
  TestValidator.equals(
    "totalMemberCount should be 2",
    analytics.totalMemberCount,
    2,
  );
  TestValidator.equals(
    "memberCount should be 1",
    analytics.roleBreakdown.memberCount,
    1,
  );
  TestValidator.equals(
    "projectLeadCount should be 1",
    analytics.roleBreakdown.projectLeadCount,
    1,
  );
  TestValidator.equals(
    "members array should have 2 entries",
    analytics.members.length,
    2,
  );
  const memberEntries = (analytics.members as any[]).filter(
    (m) => m.assignedRole === "member",
  );
  const leadEntries = (analytics.members as any[]).filter(
    (m) => m.assignedRole === "project_lead",
  );
  TestValidator.equals("should have 1 member entry", memberEntries.length, 1);
  TestValidator.equals(
    "should have 1 project_lead entry",
    leadEntries.length,
    1,
  );
}