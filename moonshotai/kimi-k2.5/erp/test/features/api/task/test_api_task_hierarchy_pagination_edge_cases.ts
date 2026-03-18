import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
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

// Prepare utility import references to prevent tree-shaking
const _unused = {
  authorize_member_join,
  generate_random_erp_hrm_member_organizations_create,
  generate_random_erp_hrm_member_projects_create,
};
_unused;
export async function test_api_task_hierarchy_pagination_edge_cases(
  connection: api.IConnection,
) {
  // 1. Setup: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(),
      lastName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name() + " Org",
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<12>,
        },
      },
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name() + " Project",
      },
    },
  );
  typia.assert(project);
  // 4. Test Empty Results
  const emptyResult = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        status: "Open",
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has data array",
    Array.isArray(emptyResult.data),
    true,
  );
  TestValidator.equals("empty result has 0 items", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result pagination current",
    emptyResult.pagination.current,
    1,
  );
  // 5. Test Pagination Parameters - First Page
  const firstPageResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(firstPageResult);
  TestValidator.equals(
    "first page current is 1",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit is 10",
    firstPageResult.pagination.limit,
    10,
  );
  // 6. Test Pagination with large page number (beyond available data)
  const beyondPageResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        page: 100,
        limit: 10,
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPageResult.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page current is preserved",
    beyondPageResult.pagination.current,
    100,
  );
  // 7. Test maximum limit (100)
  const maxLimitResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit is 100",
    maxLimitResult.pagination.limit,
    100,
  );
  // 8. Test Parent Task filtering (null for top-level tasks)
  const topLevelResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        parentTaskId: null,
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(topLevelResult);
  TestValidator.predicate(
    "top-level query returns array",
    Array.isArray(topLevelResult.data),
  );
  // 9. Test filtering by non-existent parent task ID
  const nonExistentParentResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        parentTaskId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(nonExistentParentResult);
  TestValidator.equals(
    "non-existent parent returns empty",
    nonExistentParentResult.data.length,
    0,
  );
  // 10. Test filter by status with no matches
  const statusFilterResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        status: "Closed",
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(statusFilterResult);
  TestValidator.equals(
    "status filter with no matches",
    statusFilterResult.data.length,
    0,
  );
  // 11. Test date range filters
  const dateFilterResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        dueDateFrom: new Date().toISOString(),
        dueDateTo: new Date(Date.now() + 86400000).toISOString(),
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(dateFilterResult);
  // 12. Test search filter
  const searchResult = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        search: "nonexistent-task-name",
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.equals("search with no matches", searchResult.data.length, 0);
}
