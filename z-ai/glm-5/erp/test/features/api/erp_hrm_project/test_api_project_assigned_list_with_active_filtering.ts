import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_assigned_list_with_active_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account (automatically creates organization and employee)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Step 2: Create multiple projects (active status by default)
  const projectCount = 3;
  const createdProjects: IErpHrmProject[] = [];
  for (let i = 0; i < projectCount; i++) {
    const project = await generate_random_erp_hrm_member_projects_create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name()}_Project_${i}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: `#${RandomGenerator.alphabets(6)
            .split("")
            .map((c) => ((Math.random() * 16) | 0).toString(16))
            .join("")}`,
          budget_hours: typia.random<number & tags.Minimum<0>>(),
        },
      },
    );
    typia.assert(project);
    createdProjects.push(project);
  }
  // Step 3: Call PATCH /erpHrm/member/projects/assigned without filters
  const allProjectsResponse =
    await api.functional.erpHrm.member.projects.assigned.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(allProjectsResponse);
  // Step 4: Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current page is valid",
    allProjectsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allProjectsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allProjectsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allProjectsResponse.pagination.pages >= 0,
  );
  // Step 5: Verify each project has required properties
  for (const projectSummary of allProjectsResponse.data) {
    TestValidator.predicate("project has id", projectSummary.id !== undefined);
    TestValidator.predicate(
      "project has name",
      projectSummary.name !== undefined,
    );
    TestValidator.predicate(
      "project has status",
      projectSummary.status !== undefined,
    );
    TestValidator.predicate(
      "project has colorCode",
      projectSummary.colorCode !== undefined,
    );
    TestValidator.predicate(
      "project has createdAt",
      projectSummary.createdAt !== undefined,
    );
  }
  // Step 6: Verify created projects are in the response
  const allProjectIds = allProjectsResponse.data.map((p) => p.id);
  for (const project of createdProjects) {
    TestValidator.predicate(
      `project ${project.id} is in assigned list`,
      allProjectIds.includes(project.id),
    );
  }
  // Step 7: Call with status='active' filter
  const activeProjectsResponse =
    await api.functional.erpHrm.member.projects.assigned.index(
      memberConnection,
      {
        body: {
          status: "active",
        },
      },
    );
  typia.assert(activeProjectsResponse);
  // Step 8: Verify only active projects are returned
  for (const project of activeProjectsResponse.data) {
    TestValidator.equals("project status is active", project.status, "active");
  }
  // Step 9: Verify all created projects (which are active) are in active filter results
  const activeProjectIds = activeProjectsResponse.data.map((p) => p.id);
  for (const project of createdProjects) {
    TestValidator.predicate(
      `active project ${project.id} is in active filtered list`,
      activeProjectIds.includes(project.id),
    );
  }
  // Step 10: Test pagination with limit
  const paginatedResponse =
    await api.functional.erpHrm.member.projects.assigned.index(
      memberConnection,
      {
        body: {
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit is 1",
    paginatedResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records matches total",
    paginatedResponse.pagination.records ===
      allProjectsResponse.pagination.records,
  );
  // Step 11: Test search filter functionality
  const searchName = createdProjects[0].name.substring(
    0,
    Math.min(5, createdProjects[0].name.length),
  );
  const searchResponse =
    await api.functional.erpHrm.member.projects.assigned.index(
      memberConnection,
      {
        body: {
          search: searchName,
        },
      },
    );
  typia.assert(searchResponse);
  // Verify search returns matching results
  for (const project of searchResponse.data) {
    TestValidator.predicate(
      "search result contains search term",
      project.name.toLowerCase().includes(searchName.toLowerCase()),
    );
  }
}
