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
 * Test updating a project membership's capacity role from 'project-lead' back to 'member' to demote task management privileges.
 *
 * Validates the project membership update workflow where an employee's role within a project transitions from project-lead (with task management capabilities) to regular member (view-only and time logging permissions). This test ensures that role downgrades apply correctly and that associated project and employee references remain intact after the update.
 *
 * The test creates a project membership with project-lead capacity and then updates it to member, verifying that the system correctly processes the role change and returns the updated membership record with an updated timestamp.
 *
 * 1. Register a lead member account and authenticate them.
 * 2. Register another member account for the employee role.
 * 3. Create an employee record for the second member with an assigned role.
 * 4. Create a project within the lead member's organization.
 * 5. Create a project membership assigning the employee as 'project-lead'.
 * 6. Update the membership capacity role from 'project-lead' to 'member'.
 * 7. Validate the updated membership reflects the new role with correct references.
 */
export async function test_api_project_membership_update_capacity_role_from_lead_to_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup lead member
  const leadConnection: api.IConnection = { host: connection.host };
  const leadMember = await authorize_member_join(leadConnection, {
    body: {},
  });
  typia.assert(leadMember);
  // 2. Setup another member for employee
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMember = await authorize_member_join(anotherMemberConnection, {
    body: {},
  });
  typia.assert(anotherMember);
  // 3. Create employee record for the second member under lead's organization
  const employee = await generate_random_hrm_platform_member_employees_create(
    leadConnection,
    {
      body: { memberId: anotherMember.id },
    },
  );
  typia.assert(employee);
  // 4. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    leadConnection,
    { body: {} },
  );
  typia.assert(project);
  // 5. Create project membership with capacity_role='project-lead'
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      leadConnection,
      {
        body: { capacityRole: "project-lead" },
        params: { projectId: project.id },
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "initial membership is project-lead",
    membership.capacity_role,
    "project-lead",
  );
  // 6. Update membership capacity role from 'project-lead' to 'member'
  const body = {
    capacity_role: "member",
  } satisfies IHrmPlatformProjectMembership.IUpdate;
  const updatedMembership =
    await api.functional.hrmPlatform.member.projects.memberships.update(
      leadConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
        body,
      },
    );
  typia.assert(updatedMembership);
  // 7. Validate the updated membership
  TestValidator.equals(
    "capacity role is now member",
    updatedMembership.capacity_role,
    "member",
  );
  TestValidator.equals(
    "employee reference unchanged",
    updatedMembership.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project reference unchanged",
    updatedMembership.project.id,
    project.id,
  );
  TestValidator.predicate(
    "updated_at is present",
    updatedMembership.updated_at !== undefined,
  );
}
