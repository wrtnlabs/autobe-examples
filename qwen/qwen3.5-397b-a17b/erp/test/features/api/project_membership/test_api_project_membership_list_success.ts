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

/**
 * Test that an authenticated employee can successfully retrieve their assigned project memberships.
 * The test should verify: (1) The response contains an array of project membership summaries,
 * (2) Each membership includes the employee's role (member or project-lead),
 * (3) Project details are correctly included (id, name, color_code, status),
 * (4) Employee information is correctly nested in the response,
 * (5) Only non-deleted project memberships are returned,
 * (6) Projects are returned regardless of their lifecycle status (active, archived, completed).
 * Create a member account, create an employee record, create a project, assign the employee to
 * the project as a member, then retrieve the employee's project list and validate all fields
 * are present and correct.
 */
export async function test_api_project_membership_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create member-specific connection for subsequent API calls
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Create employee record for the authenticated member
  // Note: role_id is required - generate a UUID (backend may have pre-seeded roles)
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          member_id: memberAuth.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
        },
      },
    );
  typia.assert(employee);
  // 4. Create a project
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#3498db",
          status: "active",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(project);
  // 5. Assign the employee to the project as a member
  const membership: IHrmPlatformProjectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(membership);
  // 6. Retrieve the employee's project memberships
  const memberships: IHrmPlatformProjectMember.ISummary =
    await api.functional.hrmPlatform.member.projects.my.list(memberConnection);
  typia.assert(memberships);
  // 7. Validate the response structure
  // The API returns project membership summary with nested employee and project info
  TestValidator.predicate("membership has valid id", () => {
    return typeof memberships.id === "string" && memberships.id.length > 0;
  });
  TestValidator.equals("membership role is member", memberships.role, "member");
  // Validate employee information is present
  TestValidator.predicate("employee info exists", () => {
    return (
      memberships.employee !== null &&
      memberships.employee !== undefined &&
      typeof memberships.employee.id === "string"
    );
  });
  TestValidator.equals(
    "employee id matches created employee",
    memberships.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "employee display_name matches",
    memberships.employee.display_name,
    employee.display_name,
  );
  // Validate project information is present
  TestValidator.predicate("project info exists", () => {
    return (
      memberships.project !== null &&
      memberships.project !== undefined &&
      typeof memberships.project.id === "string"
    );
  });
  TestValidator.equals(
    "project id matches created project",
    memberships.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    memberships.project.name,
    project.name,
  );
  TestValidator.equals(
    "project color_code matches",
    memberships.project.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "project status matches",
    memberships.project.status,
    project.status,
  );
  // Validate timestamp is valid date-time
  TestValidator.predicate("created_at is valid date-time", () => {
    return !isNaN(Date.parse(memberships.created_at));
  });
}
