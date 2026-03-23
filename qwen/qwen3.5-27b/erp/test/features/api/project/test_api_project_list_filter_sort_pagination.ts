import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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

/**
 * Test filtering and sorting capabilities of the project listing endpoint.
 *
 * 1. Authenticate as a member user
 * 2. Create multiple test projects with different statuses and names
 * 3. Test status filter, search filter, and combined filters
 * 4. Test sorting by name, status, and created_at with ASC/DESC
 * 5. Test pagination with page and page_size parameters
 * 6. Verify pagination metadata accuracy
 */
export async function test_api_project_list_filter_sort_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple test projects with different statuses and names
  const projects: IHrmPlatformProject[] = [];
  // Create active projects
  const activeProject1 =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Alpha Project",
          status: "active",
          color_code: "#FF5733",
          description: "First active project for testing",
        },
      },
    );
  typia.assert(activeProject1);
  projects.push(activeProject1);
  const activeProject2 =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Beta Project",
          status: "active",
          color_code: "#33FF57",
          description: "Second active project for testing",
        },
      },
    );
  typia.assert(activeProject2);
  projects.push(activeProject2);
  const activeProject3 =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Gamma Project",
          status: "active",
          color_code: "#3357FF",
          description: "Third active project for testing",
        },
      },
    );
  typia.assert(activeProject3);
  projects.push(activeProject3);
  // Create completed projects
  const completedProject1 =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Delta Project",
          status: "completed",
          color_code: "#F5FF33",
          description: "First completed project for testing",
        },
      },
    );
  typia.assert(completedProject1);
  projects.push(completedProject1);
  const completedProject2 =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Epsilon Project",
          status: "completed",
          color_code: "#33FFF5",
          description: "Second completed project for testing",
        },
      },
    );
  typia.assert(completedProject2);
  projects.push(completedProject2);
  // Create archived projects
  const archivedProject1 =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Zeta Project",
          status: "archived",
          color_code: "#FF33F5",
          description: "First archived project for testing",
        },
      },
    );
  typia.assert(archivedProject1);
  projects.push(archivedProject1);
  const archivedProject2 =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Eta Project",
          status: "archived",
          color_code: "#FF8C33",
          description: "Second archived project for testing",
        },
      },
    );
  typia.assert(archivedProject2);
  projects.push(archivedProject2);
  // 3. Test status filter: status='active'
  const activeFilterResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        status: "active",
      },
    });
  typia.assert(activeFilterResult);
  TestValidator.equals(
    "active filter returns only active projects",
    activeFilterResult.data.length,
    3,
  );
  activeFilterResult.data.forEach((project) => {
    TestValidator.equals(
      `project ${project.name} has status active`,
      project.status,
      "active",
    );
  });
  // 4. Test status filter: status='completed'
  const completedFilterResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        status: "completed",
      },
    });
  typia.assert(completedFilterResult);
  TestValidator.equals(
    "completed filter returns only completed projects",
    completedFilterResult.data.length,
    2,
  );
  completedFilterResult.data.forEach((project) => {
    TestValidator.equals(
      `project ${project.name} has status completed`,
      project.status,
      "completed",
    );
  });
  // 5. Test search filter: search='Project' (case-insensitive partial match)
  const searchResult = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        search: "Project",
      },
    },
  );
  typia.assert(searchResult);
  TestValidator.equals(
    "search returns all projects containing 'Project'",
    searchResult.data.length,
    7,
  );
  searchResult.data.forEach((project) => {
    TestValidator.predicate(
      `project ${project.name} contains 'Project'`,
      project.name.toLowerCase().includes("project"),
    );
  });
  // 6. Test search filter: search='Alpha' (specific project name)
  const alphaSearchResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        search: "Alpha",
      },
    });
  typia.assert(alphaSearchResult);
  TestValidator.equals(
    "search 'Alpha' returns 1 project",
    alphaSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "search 'Alpha' returns Alpha Project",
    alphaSearchResult.data[0].name,
    "Alpha Project",
  );
  // 7. Test combined filters: status='completed' with search='Delta'
  const combinedFilterResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        status: "completed",
        search: "Delta",
      },
    });
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter returns 1 project",
    combinedFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter returns Delta Project",
    combinedFilterResult.data[0].name,
    "Delta Project",
  );
  TestValidator.equals(
    "combined filter project has status completed",
    combinedFilterResult.data[0].status,
    "completed",
  );
  // 8. Test sorting: sort='name', order='ASC' (alphabetical order)
  const nameAscResult = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        sort: "name",
        order: "ASC",
      },
    },
  );
  typia.assert(nameAscResult);
  TestValidator.equals(
    "name ASC returns all projects",
    nameAscResult.data.length,
    7,
  );
  for (let i = 1; i < nameAscResult.data.length; i++) {
    TestValidator.predicate(
      `name ASC: ${nameAscResult.data[i - 1].name} <= ${nameAscResult.data[i].name}`,
      nameAscResult.data[i - 1].name <= nameAscResult.data[i].name,
    );
  }
  // 9. Test sorting: sort='name', order='DESC' (reverse alphabetical order)
  const nameDescResult = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        sort: "name",
        order: "DESC",
      },
    },
  );
  typia.assert(nameDescResult);
  TestValidator.equals(
    "name DESC returns all projects",
    nameDescResult.data.length,
    7,
  );
  for (let i = 1; i < nameDescResult.data.length; i++) {
    TestValidator.predicate(
      `name DESC: ${nameDescResult.data[i - 1].name} >= ${nameDescResult.data[i].name}`,
      nameDescResult.data[i - 1].name >= nameDescResult.data[i].name,
    );
  }
  // 10. Test sorting: sort='status', order='DESC' (reverse alphabetical status)
  const statusDescResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        sort: "status",
        order: "DESC",
      },
    });
  typia.assert(statusDescResult);
  TestValidator.equals(
    "status DESC returns all projects",
    statusDescResult.data.length,
    7,
  );
  for (let i = 1; i < statusDescResult.data.length; i++) {
    TestValidator.predicate(
      `status DESC: ${statusDescResult.data[i - 1].status} >= ${statusDescResult.data[i].status}`,
      statusDescResult.data[i - 1].status >= statusDescResult.data[i].status,
    );
  }
  // 11. Test sorting: sort='created_at', order='ASC' (chronological order)
  const createdAtAscResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        sort: "created_at",
        order: "ASC",
      },
    });
  typia.assert(createdAtAscResult);
  TestValidator.equals(
    "created_at ASC returns all projects",
    createdAtAscResult.data.length,
    7,
  );
  for (let i = 1; i < createdAtAscResult.data.length; i++) {
    TestValidator.predicate(
      `created_at ASC: project ${i - 1} <= project ${i}`,
      new Date(createdAtAscResult.data[i - 1].created_at).getTime() <=
        new Date(createdAtAscResult.data[i].created_at).getTime(),
    );
  }
  // 12. Test pagination: page=1, page_size=3
  const paginationResult1 =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        page: 1,
        page_size: 3,
      },
    });
  typia.assert(paginationResult1);
  TestValidator.equals(
    "pagination page 1 returns 3 projects",
    paginationResult1.data.length,
    3,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginationResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 3",
    paginationResult1.pagination.limit,
    3,
  );
  TestValidator.equals(
    "pagination total records is 7",
    paginationResult1.pagination.records,
    7,
  );
  TestValidator.equals(
    "pagination total pages is 3",
    paginationResult1.pagination.pages,
    3,
  );
  // 13. Test pagination: page=2, page_size=3
  const paginationResult2 =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        page: 2,
        page_size: 3,
      },
    });
  typia.assert(paginationResult2);
  TestValidator.equals(
    "pagination page 2 returns 3 projects",
    paginationResult2.data.length,
    3,
  );
  TestValidator.equals(
    "pagination current page is 2",
    paginationResult2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination total records is 7",
    paginationResult2.pagination.records,
    7,
  );
  TestValidator.equals(
    "pagination total pages is 3",
    paginationResult2.pagination.pages,
    3,
  );
  // 14. Test pagination: page=3, page_size=3 (last page with fewer items)
  const paginationResult3 =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        page: 3,
        page_size: 3,
      },
    });
  typia.assert(paginationResult3);
  TestValidator.equals(
    "pagination page 3 returns 1 project",
    paginationResult3.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page is 3",
    paginationResult3.pagination.current,
    3,
  );
  TestValidator.equals(
    "pagination total records is 7",
    paginationResult3.pagination.records,
    7,
  );
  TestValidator.equals(
    "pagination total pages is 3",
    paginationResult3.pagination.pages,
    3,
  );
  // 15. Test pagination: page=1, page_size=10 (all projects on one page)
  const paginationResultAll =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(paginationResultAll);
  TestValidator.equals(
    "pagination with page_size 10 returns all 7 projects",
    paginationResultAll.data.length,
    7,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginationResultAll.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginationResultAll.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination total records is 7",
    paginationResultAll.pagination.records,
    7,
  );
  TestValidator.equals(
    "pagination total pages is 1",
    paginationResultAll.pagination.pages,
    1,
  );
  // 16. Verify project summary structure for all results
  paginationResultAll.data.forEach((project) => {
    typia.assert<IHrmPlatformProject.ISummary>(project);
    TestValidator.predicate(
      `project ${project.name} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        project.id,
      ),
    );
    TestValidator.predicate(
      `project ${project.name} has non-empty name`,
      project.name.length > 0,
    );
    TestValidator.predicate(
      `project ${project.name} has valid status`,
      ["active", "completed", "archived"].includes(project.status),
    );
    TestValidator.predicate(
      `project ${project.name} has non-empty color_code`,
      project.color_code.length > 0,
    );
    TestValidator.predicate(
      `project ${project.name} has valid created_at`,
      !isNaN(Date.parse(project.created_at)),
    );
  });
}
