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

export async function test_api_project_list_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create an organization so the member becomes Owner (with project:view & project:manage permissions)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create 3 projects (all default to 'active' status since ICreate has no status field)
  const uniquePrefix = RandomGenerator.alphabets(8);
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `${uniquePrefix}-alpha-project`,
        color: "#FF5733",
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `${uniquePrefix}-beta-project`,
        color: "#33FF57",
      },
    },
  );
  typia.assert(project2);
  const project3 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `${uniquePrefix}-gamma-project`,
        color: "#3357FF",
      },
    },
  );
  typia.assert(project3);
  const createdProjectIds = [project1.id, project2.id, project3.id];
  // Step 4: Filter by 'active' status
  const activeResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        status: "active",
        limit: 100,
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(activeResult);
  // All items returned must have status === 'active'
  for (const item of activeResult.data) {
    TestValidator.equals(
      "project status must be active",
      item.status,
      "active",
    );
  }
  // All 3 created projects must appear in the active filter results
  for (const id of createdProjectIds) {
    TestValidator.predicate(
      "created project must be in active results",
      activeResult.data.some((p) => p.id === id),
    );
  }
  // Step 5: Filter by 'archived' status — none of our created projects should appear
  const archivedResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        status: "archived",
        limit: 100,
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(archivedResult);
  // All items returned must have status === 'archived'
  for (const item of archivedResult.data) {
    TestValidator.equals(
      "project status must be archived",
      item.status,
      "archived",
    );
  }
  // None of our created (active) projects should appear in archived results
  for (const id of createdProjectIds) {
    TestValidator.predicate(
      "active project must NOT be in archived results",
      !archivedResult.data.some((p) => p.id === id),
    );
  }
  // Step 6: Filter by 'completed' status — none of our created projects should appear
  const completedResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        status: "completed",
        limit: 100,
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(completedResult);
  // All items returned must have status === 'completed'
  for (const item of completedResult.data) {
    TestValidator.equals(
      "project status must be completed",
      item.status,
      "completed",
    );
  }
  // None of our created (active) projects should appear in completed results
  for (const id of createdProjectIds) {
    TestValidator.predicate(
      "active project must NOT be in completed results",
      !completedResult.data.some((p) => p.id === id),
    );
  }
  // Step 7: Test search filter — search by partial unique prefix, all 3 should appear
  const searchAllResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        search: uniquePrefix,
        limit: 100,
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(searchAllResult);
  // All 3 created projects should appear in search results
  for (const id of createdProjectIds) {
    TestValidator.predicate(
      "created project must appear in prefix search results",
      searchAllResult.data.some((p) => p.id === id),
    );
  }
  // Step 8: Test search filter with specific sub-name — only 'alpha' project should match
  const searchAlphaResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        search: `${uniquePrefix}-alpha`,
        limit: 100,
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(searchAlphaResult);
  // Project1 (alpha) must appear
  TestValidator.predicate(
    "alpha project must appear in alpha search results",
    searchAlphaResult.data.some((p) => p.id === project1.id),
  );
  // Project2 (beta) and project3 (gamma) must NOT appear in alpha-specific search
  TestValidator.predicate(
    "beta project must NOT appear in alpha search results",
    !searchAlphaResult.data.some((p) => p.id === project2.id),
  );
  TestValidator.predicate(
    "gamma project must NOT appear in alpha search results",
    !searchAlphaResult.data.some((p) => p.id === project3.id),
  );
  // Step 9: Test combined status + search filter
  const combinedResult = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {
        status: "active",
        search: uniquePrefix,
        limit: 100,
      } satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(combinedResult);
  // All returned items must be active
  for (const item of combinedResult.data) {
    TestValidator.equals(
      "combined filter: status must be active",
      item.status,
      "active",
    );
  }
  // All 3 created projects must appear
  for (const id of createdProjectIds) {
    TestValidator.predicate(
      "all created projects must appear in combined active+prefix filter",
      combinedResult.data.some((p) => p.id === id),
    );
  }
}
