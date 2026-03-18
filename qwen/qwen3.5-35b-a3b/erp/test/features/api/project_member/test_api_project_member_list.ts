import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";

export async function test_api_project_member_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account and join an organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberResult);
  // Extract organization ID from the member's organization memberships
  let organizationId: string =
    memberResult.organization_memberships.length > 0
      ? memberResult.organization_memberships[0].organization.id
      : typia.random<string & tags.Format<"uuid">>();
  // 2. Create multiple employees who will be project members
  const employeeMembers: IHrmsMember.IAuthorized[] = [];
  for (let i = 0; i < 5; i++) {
    const empConnection: api.IConnection = { host: connection.host };
    const empResult = await authorize_member_join(empConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    });
    typia.assert(empResult);
    employeeMembers.push(empResult);
  }
  // 3. Create employees' organization memberships
  for (const emp of employeeMembers) {
    const joinConnection: api.IConnection = { host: connection.host };
    const orgMembership =
      await generate_random_hrms_member_organization_members_create(
        joinConnection,
        {
          body: {
            hrms_member_id: emp.id,
            hrms_organization_id: organizationId,
            hrms_organization_role_id:
              memberResult.organization_memberships[0]?.organizationRole.id ??
              typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHrmsOrganizationMember.ICreate,
        },
      );
    typia.assert(orgMembership);
  }
  // 4. Create a project within the organization
  const projectConnection: api.IConnection = { host: connection.host };
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      projectConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: typia.random<string>(),
        } satisfies IHrmsProject.ICreate,
        params: {
          organizationId: organizationId,
        },
      },
    );
  typia.assert(project);
  // 5. Add employees to the project with different roles
  const projectMembers: IHrmsProjectMember[] = [];
  const roles: ("member" | "project-lead")[] = ["member", "project-lead"];
  for (let i = 0; i < employeeMembers.length; i++) {
    const addConnection: api.IConnection = { host: connection.host };
    const projectMember =
      await generate_random_hrms_member_projects_members_add_member(
        addConnection,
        {
          body: {
            employee_id: employeeMembers[i].id,
            role: roles[i % 2],
          } satisfies IHrmsProjectMember.ICreate,
          params: {
            projectId: project as unknown as string,
          },
        },
      );
    typia.assert(projectMember);
    projectMembers.push(projectMember);
  }
  // 6. Call the project members index endpoint to retrieve all project members
  const listConnection: api.IConnection = { host: connection.host };
  const listResponse =
    await api.functional.hrms.member.organizations.projects.members.index(
      listConnection,
      {
        organizationId: organizationId,
        projectId: project as unknown as string,
        body: {
          metric: "total",
          page: 1,
          limit: 100,
        } satisfies IHrmsProjectMember.IRequest,
      },
    );
  typia.assert(listResponse);
  // 7. Validate response structure
  typia.assert(listResponse.pagination);
  typia.assert(listResponse.data);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    listResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", listResponse.pagination.limit, 100);
  TestValidator.equals(
    "pagination records count",
    listResponse.pagination.records,
    projectMembers.length,
  );
  TestValidator.equals(
    "pagination pages count",
    listResponse.pagination.pages,
    Math.ceil(projectMembers.length / 100),
  );
  // 9. Validate all project members are returned
  TestValidator.equals(
    "project members count",
    listResponse.data.length,
    projectMembers.length,
  );
  // 10. Validate each project member has correct fields
  for (let i = 0; i < listResponse.data.length; i++) {
    const member = listResponse.data[i];
    const memberWithTypia = typia.assert<IHrmsProjectMember>(member);
    // Validate member has role field
    TestValidator.equals(
      `member ${i} role`,
      memberWithTypia.role,
      projectMembers[i].role,
    );
    TestValidator.equals(
      `member ${i} employee id`,
      memberWithTypia.employee.id,
      projectMembers[i].employee.id,
    );
    TestValidator.equals(
      `member ${i} project id`,
      memberWithTypia.project.id,
      projectMembers[i].project.id,
    );
  }
  // 11. Validate employee display names are present
  for (const member of listResponse.data) {
    const memberWithTypia = typia.assert<IHrmsProjectMember>(member);
    TestValidator.predicate(
      "employee display name is present",
      memberWithTypia.employee.display_name !== undefined &&
        memberWithTypia.employee.display_name !== null,
    );
  }
}
