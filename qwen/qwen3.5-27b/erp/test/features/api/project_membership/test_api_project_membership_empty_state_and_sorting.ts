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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMembership";
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

/**
 * Test edge cases including empty project state and various sorting options for project memberships.
 *
 * This test validates:
 * 1. Empty project membership list handling
 * 2. Pagination metadata for empty state
 * 3. Multiple sorting options (role, employee_name, created_at)
 * 4. Both ascending and descending sort directions
 * 5. Soft-deleted record exclusion
 */
export async function test_api_project_membership_empty_state_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a project without any memberships
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Test empty state - call with empty request body
  const emptyStateResponse =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {} satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(emptyStateResponse);
  // 4. Verify empty state pagination
  TestValidator.equals("empty data array", emptyStateResponse.data, []);
  TestValidator.equals(
    "records count is 0",
    emptyStateResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0",
    emptyStateResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1",
    emptyStateResponse.pagination.current,
    1,
  );
  // 5. Test sorting with role field (asc)
  const roleSortResponse =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "role",
          order: "asc",
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(roleSortResponse);
  TestValidator.equals("role sort returns empty", roleSortResponse.data, []);
  // 6. Test sorting with employee_name field (asc)
  const nameSortResponse =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "employee_name",
          order: "asc",
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(nameSortResponse);
  TestValidator.equals("name sort returns empty", nameSortResponse.data, []);
  // 7. Test sorting with created_at field (asc)
  const dateSortAscResponse =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(dateSortAscResponse);
  TestValidator.equals(
    "date sort asc returns empty",
    dateSortAscResponse.data,
    [],
  );
  // 8. Test sorting with created_at field (desc)
  const dateSortDescResponse =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "created_at",
          order: "desc",
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(dateSortDescResponse);
  TestValidator.equals(
    "date sort desc returns empty",
    dateSortDescResponse.data,
    [],
  );
  // 9. Test with pagination parameters on empty state
  const paginatedResponse =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals("paginated empty state", paginatedResponse.data, []);
  TestValidator.equals("limit is 20", paginatedResponse.pagination.limit, 20);
  TestValidator.equals(
    "current page is 1",
    paginatedResponse.pagination.current,
    1,
  );
  // 10. Test with search parameter on empty state
  const searchResponse =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: "nonexistent",
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.equals(
    "search on empty returns empty",
    searchResponse.data,
    [],
  );
  // 11. Test with role filter on empty state
  const roleFilterResponse =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "member",
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(roleFilterResponse);
  TestValidator.equals(
    "role filter on empty returns empty",
    roleFilterResponse.data,
    [],
  );
  // 12. Test with role filter for project-lead on empty state
  const leadFilterResponse =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "project-lead",
        } satisfies IHrmPlatformProjectMembership.IRequest,
      },
    );
  typia.assert(leadFilterResponse);
  TestValidator.equals(
    "project-lead filter on empty returns empty",
    leadFilterResponse.data,
    [],
  );
}
