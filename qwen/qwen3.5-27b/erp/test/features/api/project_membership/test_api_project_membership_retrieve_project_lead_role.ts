import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

export async function test_api_project_membership_retrieve_project_lead_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(authResult);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: undefined,
    },
  );
  typia.assert(project);
  // 3. Create a project membership with 'project-lead' role
  const membershipBody = {
    employee_id: authResult.id,
    role: "project-lead",
  } satisfies IHrmPlatformProjectMembership.ICreate;
  const projectLeadMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        body: membershipBody,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectLeadMembership);
  // 4. Retrieve the project membership
  const retrievedMembership =
    await api.functional.hrmPlatform.member.projects.memberships.at(
      memberConnection,
      {
        projectId: project.id,
        membershipId: projectLeadMembership.id,
      },
    );
  typia.assert(retrievedMembership);
  // 5. Validate that the role is 'project-lead'
  TestValidator.equals(
    "membership role should be project-lead",
    retrievedMembership.role,
    "project-lead",
  );
  // 6. Verify the membership is linked to the correct project
  TestValidator.equals(
    "membership project ID should match",
    retrievedMembership.project.id,
    project.id,
  );
  // 7. Verify the membership is linked to the correct employee
  TestValidator.equals(
    "membership employee ID should match authenticated user",
    retrievedMembership.employee.id,
    authResult.id,
  );
  // 8. Test that employee can have different roles across multiple projects
  // Create a second project
  const secondProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(secondProject);
  // Create a membership with 'member' role on the second project
  const memberMembershipBody = {
    employee_id: authResult.id,
    role: "member",
  } satisfies IHrmPlatformProjectMembership.ICreate;
  const memberMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        body: memberMembershipBody,
        params: {
          projectId: secondProject.id,
        },
      },
    );
  typia.assert(memberMembership);
  // Retrieve and validate the second membership
  const retrievedMemberMembership =
    await api.functional.hrmPlatform.member.projects.memberships.at(
      memberConnection,
      {
        projectId: secondProject.id,
        membershipId: memberMembership.id,
      },
    );
  typia.assert(retrievedMemberMembership);
  // Validate the second membership has 'member' role
  TestValidator.equals(
    "second membership role should be member",
    retrievedMemberMembership.role,
    "member",
  );
  // Verify the second membership is linked to the correct project
  TestValidator.equals(
    "second membership project ID should match",
    retrievedMemberMembership.project.id,
    secondProject.id,
  );
  // Verify both memberships belong to the same employee
  TestValidator.equals(
    "both memberships should belong to the same employee",
    retrievedMemberMembership.employee.id,
    retrievedMembership.employee.id,
  );
  // Verify the employee has different roles on different projects
  TestValidator.notEquals(
    "employee should have different roles on different projects",
    retrievedMembership.role,
    retrievedMemberMembership.role,
  );
}
