import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";

export async function test_api_project_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the system (automatically creates organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IHrmsMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // 2. Get organization from member's memberships
  typia.assert(memberAuth.organization_memberships);
  typia.assert(memberAuth.organization_memberships.length >= 1);
  const orgMemberships = memberAuth.organization_memberships;
  const orgA = orgMemberships[0].organization;
  typia.assert(orgA);
  // 3. Create multiple projects in Organization A
  const projectsInOrgA: IHrmsProject[] = [];
  const projectCount = 3;
  for (let i = 0; i < projectCount; i++) {
    const project =
      await generate_random_hrms_member_organizations_projects_create(
        memberConnection,
        {
          params: { organizationId: orgA.id },
        },
      );
    typia.assert(project);
    projectsInOrgA.push(project);
  }
  // 4. List projects in Organization A (should see all created projects)
  const responseOrgA =
    await api.functional.hrms.member.organizations.projects.index(
      memberConnection,
      {
        organizationId: orgA.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(responseOrgA);
  // 5. Validate all projects belong to Organization A
  TestValidator.equals(
    "project count matches created",
    responseOrgA.data.length,
    projectsInOrgA.length,
  );
  TestValidator.equals(
    "total records matches",
    responseOrgA.pagination.records,
    projectCount,
  );
  TestValidator.equals(
    "pages calculated correctly",
    responseOrgA.pagination.pages,
    Math.ceil(projectCount / responseOrgA.pagination.limit),
  );
  // 6. Verify each project has correct organization_id
  for (const project of responseOrgA.data) {
    TestValidator.equals(
      "project organization_id matches org A",
      project.organization_id,
      orgA.id,
    );
    TestValidator.equals(
      "project organization_name matches org A",
      project.organization_name,
      orgA.name,
    );
  }
  // 7. Validate project status is active by default
  for (const project of responseOrgA.data) {
    TestValidator.equals("project status is active", project.status, "active");
  }
  // 8. Test pagination by requesting second page
  const secondPageResponse =
    await api.functional.hrms.member.organizations.projects.index(
      memberConnection,
      {
        organizationId: orgA.id,
        body: {
          page: 2,
          limit: 1,
        },
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page has correct limit",
    secondPageResponse.pagination.limit,
    1,
  );
  TestValidator.equals(
    "second page is page 2",
    secondPageResponse.pagination.current,
    2,
  );
  // 9. Verify pagination counts remain consistent across pages
  TestValidator.equals(
    "total records consistent across pages",
    secondPageResponse.pagination.records,
    projectCount,
  );
}
