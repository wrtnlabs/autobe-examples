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

export async function test_api_task_project_member_filter_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Setup: Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Setup: Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Test 1: Retrieve tasks with no filters (empty result expected)
  const emptyResult = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {} satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "pagination current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals("data array empty", emptyResult.data.length, 0);
  // Test 2: Pagination parameters
  const pagedResult = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(pagedResult);
  TestValidator.equals("pagination limit", pagedResult.pagination.limit, 10);
  // Test 3: Status filter
  const statusResult = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        status: "Open",
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(statusResult);
  // Test 4: Priority filter
  const priorityResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        priority: "High",
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(priorityResult);
  // Test 5: Combined filters
  const combinedResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        status: "Open",
        priority: "Medium",
        page: 1,
        limit: 5,
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(combinedResult);
  // Test 6: Date range filters
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const dateResult = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        dueDateFrom: yesterday,
        dueDateTo: tomorrow,
        createdAtFrom: yesterday,
        createdAtTo: tomorrow,
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(dateResult);
  // Test 7: Search text filter
  const searchResult = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        search: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(searchResult);
  // Test 8: Estimated hours range
  const hoursResult = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        estimatedHoursMin: 0,
        estimatedHoursMax: 100,
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(hoursResult);
  // Test 9: Parent task filter (null for top-level tasks)
  const topLevelResult =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        parentTaskId: null,
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(topLevelResult);
}
