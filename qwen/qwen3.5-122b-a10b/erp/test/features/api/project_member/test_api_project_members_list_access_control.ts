import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";

/**
 * Test project member list access control with role-based permissions.
 *
 * Validates the permission-based access control for retrieving project member lists. Ensures that only project participants (members and project-leads) can view the list of employees assigned to a project, while users without project assignment receive appropriate access denial.
 *
 * The test creates multiple member users with different project roles and validates that the access control properly enforces visibility restrictions based on project membership status.
 *
 * 1. Create first member user and authenticate as project creator.
 * 2. Create a project within the organization.
 * 3. Create second member user and assign as employee to the project with 'member' role.
 * 4. Create third member user and assign as employee to the project with 'project-lead' role.
 * 5. Create fourth member user who is NOT assigned to the project.
 * 6. Test that project member can successfully list project members.
 * 7. Test that project-lead can successfully list project members.
 * 8. Test that non-member user receives 403 Forbidden when attempting to list project members.
 */
export async function test_api_project_members_list_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member user (project creator)
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(creatorAuth);
  // 2. Create a project
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      creatorConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: "#3498db",
          status: "active",
        } satisfies IHrmProject.ICreate,
        params: {
          organizationId: creatorAuth.organizations?.[0]?.id ?? "",
        },
      },
    );
  typia.assert(project);
  // 3. Create second member user and assign as project member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Assign member user as project member
  const memberAssignment =
    await generate_random_hrm_member_projects_members_create(
      creatorConnection,
      {
        body: {
          employee_id: memberAuth.id,
          role: "member",
        } satisfies IHrmProjectMember.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(memberAssignment);
  // 4. Create third member user and assign as project-lead
  const leadConnection: api.IConnection = { host: connection.host };
  const leadAuth = await authorize_member_join(leadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(leadAuth);
  // Assign lead user as project-lead
  const leadAssignment =
    await generate_random_hrm_member_projects_members_create(
      creatorConnection,
      {
        body: {
          employee_id: leadAuth.id,
          role: "project-lead",
        } satisfies IHrmProjectMember.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(leadAssignment);
  // 5. Create fourth member user who is NOT assigned to the project
  const outsiderConnection: api.IConnection = { host: connection.host };
  const outsiderAuth = await authorize_member_join(outsiderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(outsiderAuth);
  // 6. Test that project member can successfully list project members
  const memberListResult =
    await api.functional.hrm.member.projects.members.index(memberConnection, {
      projectId: project.id,
      body: {} satisfies IHrmProjectMember.IRequest,
    });
  typia.assert(memberListResult);
  TestValidator.predicate(
    "member can list project members",
    memberListResult.data.length > 0,
  );
  // 7. Test that project-lead can successfully list project members
  const leadListResult = await api.functional.hrm.member.projects.members.index(
    leadConnection,
    {
      projectId: project.id,
      body: {} satisfies IHrmProjectMember.IRequest,
    },
  );
  typia.assert(leadListResult);
  TestValidator.predicate(
    "project-lead can list project members",
    leadListResult.data.length > 0,
  );
  // 8. Test that non-member user receives 403 Forbidden
  await TestValidator.httpError(
    "non-member receives 403 Forbidden",
    403,
    async () => {
      await api.functional.hrm.member.projects.members.index(
        outsiderConnection,
        {
          projectId: project.id,
          body: {} satisfies IHrmProjectMember.IRequest,
        },
      );
    },
  );
}
