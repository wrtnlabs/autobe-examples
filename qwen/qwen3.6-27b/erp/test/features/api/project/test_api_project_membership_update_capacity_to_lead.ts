import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

/**
 * Test updating a project membership's capacity role from 'member' to 'project-lead'.
 *
 * Validates that an existing project membership can have its capacity role upgraded
 * from a regular member with time-logging permissions to a project lead with full task
 * management permissions within the project. The employee and project references remain
 * unchanged after the update, and the updated_at timestamp reflects the modification time.
 *
 * 1. Administrator registers and creates a project within their organization.
 * 2. A second member registers and is invited as an employee to the organization.
 * 3. The employee is assigned to the project as a regular 'member' capacity role.
 * 4. The membership is updated to change capacity role from 'member' to 'project-lead'.
 * 5. Verify the response returns the updated membership with capacity_role='project-lead' and an updated 'updated_at' timestamp. Verify the employee and project references remain unchanged.
 */
export async function test_api_project_membership_update_capacity_to_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and authenticates (auto-provisions organization)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {});
  typia.assert(adminMember);
  // 2. Second member registers (separate organization initially)
  const memberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(memberConnection, {});
  typia.assert(secondMember);
  // 3. Administrator invites second member as employee in their organization
  // The generate function handles preparing the request including finding a valid role
  const employee = await generate_random_hrm_platform_member_employees_create(
    adminConnection,
    {
      body: { memberId: secondMember.id, employmentType: "full-time" },
    },
  );
  typia.assert(employee);
  // 4. Administrator creates a project
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 5. Administrator creates membership with capacity_role='member'
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: { employeeId: employee.id, capacityRole: "member" },
      },
    );
  typia.assert(membership);
  // 6. Update the membership to change capacity_role to 'project-lead'
  const body = {
    capacity_role: "project-lead",
  } satisfies IHrmPlatformProjectMembership.IUpdate;
  const updatedMembership =
    await api.functional.hrmPlatform.member.projects.memberships.update(
      adminConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
        body,
      },
    );
  typia.assert(updatedMembership);
  // 7. Validate the update results
  TestValidator.equals(
    "capacity_role is now project-lead",
    updatedMembership.capacity_role,
    "project-lead",
  );
  TestValidator.equals(
    "employee reference unchanged",
    updatedMembership.employee.id,
    membership.employee.id,
  );
  TestValidator.equals(
    "project reference unchanged",
    updatedMembership.project.id,
    membership.project.id,
  );
  TestValidator.equals(
    "membership ID unchanged",
    updatedMembership.id,
    membership.id,
  );
  TestValidator.predicate(
    "updated_at is different (timestamp changed on update)",
    updatedMembership.updated_at !== membership.updated_at,
  );
}
