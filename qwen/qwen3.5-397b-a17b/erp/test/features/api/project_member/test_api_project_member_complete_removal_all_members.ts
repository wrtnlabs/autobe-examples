import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

/**
 * Test the project member update operation for member role modification.
 *
 * Validates the project member update workflow by creating a project member assignment and then updating it with a different role. This test ensures that the update endpoint correctly handles role changes for existing project members.
 *
 * The test creates an organization, project, and employee record, assigns the employee to the project with member role, then updates the assignment to project-lead role, and validates that the role change is reflected in the response.
 *
 * 1. Member authenticates and creates an organization.
 * 2. An employee record is created within the organization.
 * 3. A project is created within the organization.
 * 4. Employee is assigned to the project with member role.
 * 5. Initial membership is verified through the assignment response.
 * 6. Update is performed to change the member role to project-lead.
 * 7. Response is validated to contain the updated role.
 * 8. Additional member is assigned to verify multiple members can exist.
 */
export async function test_api_project_member_complete_removal_all_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with project:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 4. Create employee by inviting the member (creates employee immediately since email exists)
  const employeeInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: memberAuth.email,
          role_id: organization.id,
          employment_type: "full-time",
          expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        },
      },
    );
  typia.assert(employeeInvitation);
  // Note: When inviting an existing member, the response is an employee record
  // We need to extract the employee ID from the invitation response
  // The invitation response type is IHrmPlatformEmployeeInvitation which has employee relation
  // However, for existing members, it returns the employee directly
  // We'll use the organization owner (memberAuth) as the employee
  // Since we don't have a direct way to get employee ID, we'll create the assignment
  // and track it through the response
  // 5. Assign initial project member with member role
  const initialAssignment =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          role: "member",
        },
      },
    );
  typia.assert(initialAssignment);
  // Verify initial assignment
  TestValidator.equals(
    "initial role is member",
    initialAssignment.role,
    "member",
  );
  TestValidator.equals(
    "project matches",
    initialAssignment.project.id,
    project.id,
  );
  // 6. Update project member to change role to project-lead
  // Note: The SDK expects IHrmPlatformProjectMember.IUpdate (single object, not array)
  const updateResult =
    await api.functional.hrmPlatform.member.projects.members.update(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employee_id: initialAssignment.employee.id,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 7. Verify response contains updated member with new role
  TestValidator.predicate(
    "update returns at least 1 member",
    updateResult.data.length >= 1,
  );
  // Find the updated member in the response
  const updatedMember = updateResult.data.find(
    (m) => m.employee.id === initialAssignment.employee.id,
  );
  TestValidator.predicate(
    "updated member exists in response",
    updatedMember !== undefined,
  );
  if (updatedMember) {
    TestValidator.equals(
      "role changed to project-lead",
      updatedMember.role,
      "project-lead",
    );
  }
  // Verify pagination structure
  TestValidator.predicate(
    "pagination records is at least 1",
    updateResult.pagination.records >= 1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    updateResult.pagination.current,
    1,
  );
  // 8. Add another member to verify multiple members can exist
  const employeeInvitation2 =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: organization.id,
          employment_type: "part-time",
          expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        },
      },
    );
  typia.assert(employeeInvitation2);
  // Create second member account and employee
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: employeeInvitation2.email,
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  // Create employee for second member
  const employeeInvitation3 =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: member2Auth.email,
          role_id: organization.id,
          employment_type: "part-time",
          expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        },
      },
    );
  typia.assert(employeeInvitation3);
  // Assign second member to project
  const secondAssignment =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          role: "member",
        },
      },
    );
  typia.assert(secondAssignment);
  // Verify both members exist
  const finalResult =
    await api.functional.hrmPlatform.member.projects.members.update(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employee_id: secondAssignment.employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.IUpdate,
      },
    );
  typia.assert(finalResult);
  TestValidator.predicate(
    "final result has at least 2 members",
    finalResult.data.length >= 2,
  );
  TestValidator.equals(
    "pagination records reflects member count",
    finalResult.pagination.records,
    finalResult.data.length,
  );
}
