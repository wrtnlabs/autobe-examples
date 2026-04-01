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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

export async function test_api_project_member_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create organization (automatically creates employee record for member)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Select organization as active context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  // 4. Create project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
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
  // 5. Create two project member assignments with different roles
  // Note: In simulation mode, we use random UUIDs for employee IDs
  const employeeId1 = typia.random<string & tags.Format<"uuid">>();
  const employeeId2 = typia.random<string & tags.Format<"uuid">>();
  const memberAssignment =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeId1,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(memberAssignment);
  const leadAssignment =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeId2,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(leadAssignment);
  // 6. Test filtering by role='project-lead'
  const projectLeadFilter =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "project-lead",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(projectLeadFilter);
  // Validate only project-lead roles are returned
  TestValidator.predicate("all filtered members are project-leads", () =>
    projectLeadFilter.data.every((m) => m.role === "project-lead"),
  );
  TestValidator.equals(
    "project-lead count matches data length",
    projectLeadFilter.pagination.records,
    projectLeadFilter.data.length,
  );
  // 7. Test filtering by role='member'
  const memberFilter =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "member",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(memberFilter);
  // Validate only member roles are returned
  TestValidator.predicate("all filtered members are regular members", () =>
    memberFilter.data.every((m) => m.role === "member"),
  );
  TestValidator.equals(
    "member count matches data length",
    memberFilter.pagination.records,
    memberFilter.data.length,
  );
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    () => projectLeadFilter.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () => projectLeadFilter.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    () => projectLeadFilter.pagination.pages >= 1,
  );
}
