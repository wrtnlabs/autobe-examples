import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_list_by_authorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization (member becomes Owner with project:view and project:manage permissions)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create 3 projects of varying statuses
  const projectA = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Alpha Project",
        color: "#FF5733",
        description: "Active project for testing",
        budget_hours: 100,
      },
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Beta Project",
        color: "#33FF57",
        description: "Second project for testing",
        budget_hours: 200,
      },
    },
  );
  typia.assert(projectB);
  const projectC = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Gamma Project",
        color: "#3357FF",
        description: "Third project for testing",
        budget_hours: 50,
      },
    },
  );
  typia.assert(projectC);
  // ----------------------------------------------------------------
  // Primary success test: no filters (default pagination)
  // ----------------------------------------------------------------
  const defaultList = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(defaultList);
  // Verify default pagination metadata
  TestValidator.equals(
    "default page current",
    defaultList.pagination.current,
    1,
  );
  TestValidator.equals("default page limit", defaultList.pagination.limit, 20);
  TestValidator.predicate("records >= 3", defaultList.pagination.records >= 3);
  TestValidator.predicate("pages >= 1", defaultList.pagination.pages >= 1);
  TestValidator.predicate(
    "pages equals ceil(records/limit)",
    defaultList.pagination.pages ===
      Math.ceil(defaultList.pagination.records / defaultList.pagination.limit),
  );
  // Verify data is non-empty and our 3 created projects are in the result
  TestValidator.predicate("data has items", defaultList.data.length > 0);
  const projectIds = defaultList.data.map((p) => p.id);
  TestValidator.predicate(
    "project A in list",
    projectIds.includes(projectA.id),
  );
  TestValidator.predicate(
    "project B in list",
    projectIds.includes(projectB.id),
  );
  TestValidator.predicate(
    "project C in list",
    projectIds.includes(projectC.id),
  );
  // ----------------------------------------------------------------
  // Pagination test: page=1, limit=2
  // ----------------------------------------------------------------
  const paginatedList = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(paginatedList);
  TestValidator.equals(
    "paginated current page",
    paginatedList.pagination.current,
    1,
  );
  TestValidator.equals("paginated limit", paginatedList.pagination.limit, 2);
  TestValidator.equals("paginated data count", paginatedList.data.length, 2);
  TestValidator.predicate(
    "paginated records >= 3",
    paginatedList.pagination.records >= 3,
  );
  TestValidator.predicate(
    "paginated pages equals ceil(records/2)",
    paginatedList.pagination.pages ===
      Math.ceil(paginatedList.pagination.records / 2),
  );
  // ----------------------------------------------------------------
  // Sorting test: sort by name ascending
  // ----------------------------------------------------------------
  const sortedByNameAsc = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        sort: "name",
        order: "asc",
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(sortedByNameAsc);
  // Verify ascending order by name
  const names = sortedByNameAsc.data.map((p) => p.name);
  for (let i = 1; i < names.length; i++) {
    TestValidator.predicate(
      `name sort asc index ${i - 1} <= ${i}`,
      names[i - 1].localeCompare(names[i]) <= 0,
    );
  }
  // ----------------------------------------------------------------
  // Sorting test: sort by created_at descending (newest first)
  // ----------------------------------------------------------------
  const sortedByCreatedAtDesc =
    await api.functional.erpHrm.member.projects.index(memberConnection, {
      body: {
        sort: "created_at",
        order: "desc",
      } satisfies IErpHrmProject.IRequest,
    });
  typia.assert(sortedByCreatedAtDesc);
  // Verify descending order by created_at (newest first)
  const createdAts = sortedByCreatedAtDesc.data.map((p) => p.created_at);
  for (let i = 1; i < createdAts.length; i++) {
    TestValidator.predicate(
      `created_at sort desc index ${i - 1} >= ${i}`,
      new Date(createdAts[i - 1]).getTime() >=
        new Date(createdAts[i]).getTime(),
    );
  }
}
