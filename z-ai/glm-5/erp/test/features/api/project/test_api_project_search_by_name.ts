import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create test projects with distinct names
  const projectNames = [
    "Website Redesign Project",
    "Mobile App Development",
    "Backend API Refactoring",
    "Marketing Campaign 2024",
  ];
  const createdProjects = await ArrayUtil.asyncMap(
    projectNames,
    async (name: string) => {
      const project = await api.functional.erpHrm.member.projects.create(
        memberConnection,
        {
          body: {
            name,
            color_code: "#FF5733",
          } satisfies IErpHrmProject.ICreate,
        },
      );
      typia.assert(project);
      return project;
    },
  );
  // 3. Test partial match search - 'Project' should match 'Website Redesign Project'
  const projectSearchResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        search: "Project",
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(projectSearchResult);
  TestValidator.predicate(
    "search 'Project' should return 'Website Redesign Project'",
    projectSearchResult.data.some((p) => p.name === "Website Redesign Project"),
  );
  // 4. Test partial match search - 'API' should match 'Backend API Refactoring'
  const apiSearchResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        search: "API",
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(apiSearchResult);
  TestValidator.predicate(
    "search 'API' should return 'Backend API Refactoring'",
    apiSearchResult.data.some((p) => p.name === "Backend API Refactoring"),
  );
  // 5. Test case-insensitive search - 'mobile' should match 'Mobile App Development'
  const mobileSearchResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        search: "mobile",
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(mobileSearchResult);
  TestValidator.predicate(
    "search 'mobile' should return 'Mobile App Development' (case-insensitive)",
    mobileSearchResult.data.some((p) => p.name === "Mobile App Development"),
  );
  // 6. Test case-insensitive search - 'WEBSITE' should match 'Website Redesign Project'
  const websiteSearchResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        search: "WEBSITE",
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(websiteSearchResult);
  TestValidator.predicate(
    "search 'WEBSITE' should return 'Website Redesign Project' (case-insensitive)",
    websiteSearchResult.data.some((p) => p.name === "Website Redesign Project"),
  );
  // 7. Test case-insensitive search - 'marketing' should match 'Marketing Campaign 2024'
  const marketingSearchResult =
    await api.functional.erpHrm.member.projects.index(memberConnection, {
      body: {
        search: "marketing",
      } satisfies IErpHrmProject.IRequest,
    });
  typia.assert(marketingSearchResult);
  TestValidator.predicate(
    "search 'marketing' should return 'Marketing Campaign 2024' (case-insensitive)",
    marketingSearchResult.data.some(
      (p) => p.name === "Marketing Campaign 2024",
    ),
  );
  // 8. Test no results scenario - search for non-existent term
  const noResultsSearch = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        search: "NonExistentProjectName12345",
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(noResultsSearch);
  TestValidator.equals(
    "non-existent search should return empty data array",
    noResultsSearch.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent search should have 0 records",
    noResultsSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent search should have 0 pages",
    noResultsSearch.pagination.pages,
    0,
  );
  // 9. Test combined filters - search by name AND status
  const combinedFilterResult =
    await api.functional.erpHrm.member.projects.index(memberConnection, {
      body: {
        search: "Project",
        status: "active",
      } satisfies IErpHrmProject.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter should return projects with 'Project' in name AND status 'active'",
    combinedFilterResult.data.some(
      (p) => p.name === "Website Redesign Project",
    ),
  );
  TestValidator.predicate(
    "combined filter results should all have status 'active'",
    combinedFilterResult.data.every((p) => p.status === "active"),
  );
}