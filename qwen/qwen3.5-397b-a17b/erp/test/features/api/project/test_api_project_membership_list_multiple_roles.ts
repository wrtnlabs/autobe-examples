import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
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
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

export async function test_api_project_membership_list_multiple_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create employee record for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: authorized.id,
      } satisfies Partial<IHrmPlatformEmployee.ICreate>,
    },
  );
  typia.assert(employee);
  // 3. Create first project
  const project1 =
    await generate_random_hrm_platform_member_projects_create(memberConnection, {
      body: {},
    });
  typia.assert(project1);
  // 4. Create second project
  const project2 =
    await generate_random_hrm_platform_member_projects_create(memberConnection, {
      body: {},
    });
  typia.assert(project2);
  // 5. Assign employee to first project as 'member'
  const membership1 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project1.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(membership1);
  // 6. Assign employee to second project as 'project-lead'
  const membership2 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project2.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(membership2);
  // 7. Retrieve project memberships for the current employee
  const memberships: IHrmPlatformProjectMember.ISummary =
    await api.functional.hrmPlatform.member.projects.my.list(memberConnection);
  typia.assert(memberships);
  // 8. Validate both memberships are present with correct roles
  const membershipArray = Array.isArray(memberships)
    ? memberships
    : [memberships];
  TestValidator.predicate(
    "should have 2 memberships",
    () => membershipArray.length === 2,
  );
  const memberRoleMembership = membershipArray.find((m) => m.role === "member");
  const projectLeadRoleMembership = membershipArray.find(
    (m) => m.role === "project-lead",
  );
  TestValidator.predicate(
    "should have member role membership",
    () => memberRoleMembership !== undefined,
  );
  TestValidator.predicate(
    "should have project-lead role membership",
    () => projectLeadRoleMembership !== undefined,
  );
  // Validate project-role correlation: project1 should have member role, project2 should have project-lead role
  TestValidator.predicate(
    "project1 should have member role assignment",
    () =>
      memberRoleMembership!.project.id === project1.id &&
      memberRoleMembership!.role === "member",
  );
  TestValidator.predicate(
    "project2 should have project-lead role assignment",
    () =>
      projectLeadRoleMembership!.project.id === project2.id &&
      projectLeadRoleMembership!.role === "project-lead",
  );
  // Validate employee reference in both memberships
  TestValidator.predicate(
    "member role has correct employee",
    () => memberRoleMembership!.employee.id === employee.id,
  );
  TestValidator.predicate(
    "project-lead role has correct employee",
    () => projectLeadRoleMembership!.employee.id === employee.id,
  );
}