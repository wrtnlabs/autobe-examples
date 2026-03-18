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
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";

export async function test_api_project_members_list_primary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member (creates member and organization)
  const authConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Get organization ID from member's organization memberships
  const organizationId = memberAuth.organization_memberships[0].organization.id;
  typia.assert(organizationId);
  // 2. Create a project within the organization
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      authConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        },
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  const projectSummary = project as unknown as IHrmsProject.ISummary;
  // 3. Add employees to the project with different roles
  const employee1Id = typia.random<string & tags.Format<"uuid">>();
  const employee2Id = typia.random<string & tags.Format<"uuid">>();
  const employee3Id = typia.random<string & tags.Format<"uuid">>();
  // Add first employee as project-lead
  const member1 = await generate_random_hrms_member_projects_members_add_member(
    authConnection,
    {
      body: {
        employee_id: employee1Id,
        role: "project-lead",
      },
      params: {
        projectId: projectSummary.id,
      },
    },
  );
  typia.assert(member1);
  // Add second employee as member
  const member2 = await generate_random_hrms_member_projects_members_add_member(
    authConnection,
    {
      body: {
        employee_id: employee2Id,
        role: "member",
      },
      params: {
        projectId: projectSummary.id,
      },
    },
  );
  typia.assert(member2);
  // Add third employee as member
  const member3 = await generate_random_hrms_member_projects_members_add_member(
    authConnection,
    {
      body: {
        employee_id: employee3Id,
        role: "member",
      },
      params: {
        projectId: projectSummary.id,
      },
    },
  );
  typia.assert(member3);
  // 4. Call the endpoint to retrieve all active project members
  const memberListConnection: api.IConnection = { host: connection.host };
  memberListConnection.headers = {
    ...memberListConnection.headers,
    Authorization: memberAuth.token.access,
  };
  const listResult: IPageIHrmsProjectMember.ISummary =
    await api.functional.hrms.member.projects.members.index(
      memberListConnection,
      {
        projectId: projectSummary.id,
        body: {
          metric: "total",
          page: 0,
          limit: 100,
        },
      },
    );
  typia.assert(listResult);
  // 5. Validate response includes all expected members
  TestValidator.equals(
    "should have 3 project members",
    listResult.data.length,
    3,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    listResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", listResult.pagination.limit, 100);
  TestValidator.equals(
    "pagination records count",
    listResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages count",
    listResult.pagination.pages,
    1,
  );
  // Validate all members have required fields
  listResult.data.forEach((member: IHrmsProjectMember.ISummary) => {
    TestValidator.notEquals("member has id", member.id, null);
    TestValidator.notEquals(
      "member has display name",
      member.displayName,
      null,
    );
  });
}
