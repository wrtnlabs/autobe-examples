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
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

export async function test_api_project_membership_filter_by_role_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create project memberships with different roles
  // Note: In a real scenario, we would have multiple employees. For this test,
  // we'll create memberships and test the filtering capabilities.
  // Create first membership as project-lead
  const membership1 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: memberAuth.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(membership1);
  // 4. Test role filter - filter by 'project-lead'
  const roleFiltered =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "project-lead",
        },
      },
    );
  typia.assert(roleFiltered);
  TestValidator.equals(
    "role filter returns project-leads",
    roleFiltered.pagination.records,
    1,
  );
  TestValidator.predicate("all results have project-lead role", () =>
    roleFiltered.data.every((m) => m.role === "project-lead"),
  );
  // 5. Test role filter - filter by 'member' (should return empty)
  const memberFiltered =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "member",
        },
      },
    );
  typia.assert(memberFiltered);
  TestValidator.equals(
    "role filter returns no members",
    memberFiltered.pagination.records,
    0,
  );
  TestValidator.equals(
    "role filter returns empty array",
    memberFiltered.data.length,
    0,
  );
  // 6. Test search filter with partial email matching
  // Extract a substring from the member's email for search
  const searchTerm = memberAuth.email.split("@")[0].substring(0, 3);
  const searchFiltered =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: searchTerm,
        },
      },
    );
  typia.assert(searchFiltered);
  // Verify search returns matching results
  TestValidator.predicate(
    "search returns at least one result",
    () => searchFiltered.data.length >= 1,
  );
  // 7. Test sorting by created_at in descending order
  const sortedByDate =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(sortedByDate);
  TestValidator.equals(
    "sorted results count",
    sortedByDate.pagination.records,
    1,
  );
  // 8. Test sorting by role
  const sortedByRole =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "role",
          order: "asc",
        },
      },
    );
  typia.assert(sortedByRole);
  TestValidator.equals(
    "sorted by role results count",
    sortedByRole.pagination.records,
    1,
  );
  // 9. Test pagination with custom page and limit
  const paginated =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginated.pagination.limit, 10);
  TestValidator.equals("pagination records", paginated.pagination.records, 1);
  // 10. Test pagination with page 2 (should return empty)
  const paginatedPage2 =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 2,
          limit: 1,
        },
      },
    );
  typia.assert(paginatedPage2);
  TestValidator.equals(
    "pagination page 2 current",
    paginatedPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination page 2 records",
    paginatedPage2.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination page 2 empty data",
    paginatedPage2.data.length,
    0,
  );
  // 11. Test combined filters (role + sort + pagination)
  const combinedFiltered =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "project-lead",
          sort: "created_at",
          order: "desc",
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filter returns correct count",
    combinedFiltered.pagination.records,
    1,
  );
  TestValidator.equals(
    "combined filter pagination limit",
    combinedFiltered.pagination.limit,
    5,
  );
  TestValidator.predicate("combined filter role check", () =>
    combinedFiltered.data.every((m) => m.role === "project-lead"),
  );
  // 12. Test empty results with non-existent search term
  const emptyFiltered =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: "nonexistent_user_xyz_12345",
        },
      },
    );
  typia.assert(emptyFiltered);
  TestValidator.equals(
    "empty search returns zero records",
    emptyFiltered.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns empty array",
    emptyFiltered.data.length,
    0,
  );
  // 13. Test no filter (should return all memberships)
  const allMemberships =
    await api.functional.hrmPlatform.member.projects.memberships.index(
      memberConnection,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(allMemberships);
  TestValidator.equals(
    "no filter returns all memberships",
    allMemberships.pagination.records,
    1,
  );
  TestValidator.equals("no filter data length", allMemberships.data.length, 1);
}
