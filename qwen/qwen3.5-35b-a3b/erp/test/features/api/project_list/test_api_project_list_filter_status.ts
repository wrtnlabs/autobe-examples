import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_project_list_filter_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  const memberConnectionForProjects: api.IConnection = {
    host: connection.host,
  };
  memberConnectionForProjects.headers = {
    Authorization: authResult.token.access,
  };
  // 2. Create projects with different statuses
  const projectAlpha = await api.functional.hrmPlatform.member.projects.create(
    memberConnectionForProjects,
    {
      body: {
        name: "Project Alpha",
        color_code: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectAlpha);
  const projectBeta = await api.functional.hrmPlatform.member.projects.create(
    memberConnectionForProjects,
    {
      body: {
        name: "Project Beta",
        color_code: "#33FF57",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectBeta);
  const projectArchived =
    await api.functional.hrmPlatform.member.projects.create(
      memberConnectionForProjects,
      {
        body: {
          name: "Archive Project",
          color_code: "#3357FF",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectArchived);
  const projectCompleted =
    await api.functional.hrmPlatform.member.projects.create(
      memberConnectionForProjects,
      {
        body: {
          name: "Completed Project",
          color_code: "#FF33F5",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectCompleted);
  // 3. Validate status filter for 'active'
  const activeFilterResponse =
    await api.functional.hrmPlatform.member.projects.index(
      memberConnectionForProjects,
      {
        body: {
          status: "active",
          page: 1,
        } satisfies IHrmPlatformProject.IRequest,
      },
    );
  typia.assert(activeFilterResponse);
  const activeProjects = activeFilterResponse.data;
  TestValidator.equals(
    "active status filter returns 2 projects",
    activeProjects.length,
    2,
  );
  TestValidator.equals(
    "active status filter pagination records",
    activeFilterResponse.pagination.records,
    2,
  );
  TestValidator.equals(
    "active status filter pagination pages",
    activeFilterResponse.pagination.pages,
    1,
  );
  // Verify only active projects are returned
  const returnedNames = activeProjects.map((p) => p.name);
  TestValidator.predicate(
    "only active projects returned",
    returnedNames.every(
      (name) => name === "Project Alpha" || name === "Project Beta",
    ),
  );
  TestValidator.equals(
    "archived project excluded from active filter",
    returnedNames.includes("Archive Project"),
    false,
  );
  TestValidator.equals(
    "completed project excluded from active filter",
    returnedNames.includes("Completed Project"),
    false,
  );
  // 4. Validate name search filter with 'alpha'
  const searchAlphaResponse =
    await api.functional.hrmPlatform.member.projects.index(
      memberConnectionForProjects,
      {
        body: {
          search: "alpha",
          page: 1,
        } satisfies IHrmPlatformProject.IRequest,
      },
    );
  typia.assert(searchAlphaResponse);
  const searchAlphaProjects = searchAlphaResponse.data;
  TestValidator.equals(
    "search 'alpha' returns 1 project",
    searchAlphaProjects.length,
    1,
  );
  TestValidator.equals(
    "search 'alpha' returns Project Alpha",
    searchAlphaProjects[0].name,
    "Project Alpha",
  );
  TestValidator.equals(
    "Project Beta not returned by 'alpha' search",
    searchAlphaProjects.some((p) => p.name === "Project Beta"),
    false,
  );
  // 5. Validate combined filter (status='active' AND search='project')
  const combinedFilterResponse =
    await api.functional.hrmPlatform.member.projects.index(
      memberConnectionForProjects,
      {
        body: {
          status: "active",
          search: "project",
          page: 1,
        } satisfies IHrmPlatformProject.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  const combinedProjects = combinedFilterResponse.data;
  TestValidator.equals(
    "combined filter returns 2 active projects",
    combinedProjects.length,
    2,
  );
  const combinedNames = combinedProjects.map((p) => p.name);
  TestValidator.equals(
    "combined filter includes Project Alpha",
    combinedNames.includes("Project Alpha"),
    true,
  );
  TestValidator.equals(
    "combined filter includes Project Beta",
    combinedNames.includes("Project Beta"),
    true,
  );
  TestValidator.equals(
    "combined filter excludes Archive Project",
    combinedNames.includes("Archive Project"),
    false,
  );
  TestValidator.equals(
    "combined filter excludes Completed Project",
    combinedNames.includes("Completed Project"),
    false,
  );
  // 6. Validate no matches scenario
  const noMatchResponse =
    await api.functional.hrmPlatform.member.projects.index(
      memberConnectionForProjects,
      {
        body: {
          search: "nonexistent123xyz",
          page: 1,
        } satisfies IHrmPlatformProject.IRequest,
      },
    );
  typia.assert(noMatchResponse);
  TestValidator.equals(
    "no match search returns empty array",
    noMatchResponse.data.length,
    0,
  );
  TestValidator.equals(
    "no match search pagination records is 0",
    noMatchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match search pagination pages is 0",
    noMatchResponse.pagination.pages,
    0,
  );
}