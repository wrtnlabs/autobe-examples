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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

/**
 * Test project member removal by manager.
 *
 * This test verifies the primary success path for removing an employee from a project.
 * A manager with project:manage permission removes a team member from a project.
 *
 * Test flow:
 * 1. Create manager account and organization
 * 2. Create employee account and add to organization
 * 3. Create project under manager's organization
 * 4. Assign employee to project (create membership)
 * 5. Remove employee from project using manager's connection
 * 6. Verify removal operation completes successfully
 */
export async function test_api_project_member_removal_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create manager account with organization
  const managerAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(
      { host: connection.host },
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(managerAuth);
  const managerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: managerAuth.token.access },
  };
  // Create organization for manager
  const organization: IHrmPlatformOrganization =
    await generate_random_hrm_platform_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // Step 2: Create employee account
  const employeeAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(
      { host: connection.host },
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(employeeAuth);
  // Add employee to organization (manager creates employee record)
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      managerConnection,
      {
        body: {
          member_id: employeeAuth.member.id,
          employment_type: "full-time",
          status: "active",
        },
      },
    );
  typia.assert(employee);
  // Step 3: Create project under manager's organization
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          color_code: "#3498db",
          status: "active",
        },
      },
    );
  typia.assert(project);
  // Step 4: Assign employee to project (create membership)
  const membership: IHrmPlatformProjectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(membership);
  // Verify membership was created successfully
  TestValidator.equals(
    "membership employee matches",
    membership.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "membership project matches",
    membership.project.id,
    project.id,
  );
  TestValidator.predicate(
    "membership is active (not deleted)",
    membership.deleted_at === null,
  );
  // Step 5: Remove employee from project using manager's connection
  await api.functional.hrmPlatform.member.projects.members.erase(
    managerConnection,
    {
      projectId: project.id,
      membershipId: membership.id,
    },
  );
  // Step 6: Verify removal completed (void response indicates success)
  // Note: Full verification of soft delete, activity log, and access restrictions
  // would require additional read endpoints not available in current SDK
}
