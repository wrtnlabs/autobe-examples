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

export async function test_api_task_filter_combinations_authorization_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create first member (project owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // Create organization as first member
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      member1Connection,
      {},
    );
  typia.assert(organization);
  // Create Project A and Project B
  const projectA = await generate_random_erp_hrm_member_projects_create(
    member1Connection,
    {
      body: { name: "Project A Filter Test" },
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_erp_hrm_member_projects_create(
    member1Connection,
    {
      body: { name: "Project B Filter Test" },
    },
  );
  typia.assert(projectB);
  // Create second member (non-member of projects)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // Test 1: Member 1 (owner) queries Project A tasks with combined status and priority filters
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tasksProjectACombined =
    await api.functional.erpHrm.member.projects.tasks.index(member1Connection, {
      projectId: projectA.id,
      body: {
        status: "Open",
        priority: "High",
        page: 1,
        limit: 10,
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(tasksProjectACombined);
  TestValidator.equals(
    "pagination current page",
    tasksProjectACombined.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    tasksProjectACombined.pagination.limit,
    10,
  );
  // Test 2: Member 1 queries Project B tasks with date range filters
  const tasksProjectBDateRange =
    await api.functional.erpHrm.member.projects.tasks.index(member1Connection, {
      projectId: projectB.id,
      body: {
        dueDateFrom: now.toISOString(),
        dueDateTo: tomorrow.toISOString(),
        createdAtFrom: now.toISOString(),
        createdAtTo: tomorrow.toISOString(),
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(tasksProjectBDateRange);
  // Test 3: Member 1 queries with estimated hours range
  const tasksEstimatedHours =
    await api.functional.erpHrm.member.projects.tasks.index(member1Connection, {
      projectId: projectA.id,
      body: {
        estimatedHoursMin: 4.0,
        estimatedHoursMax: 8.0,
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(tasksEstimatedHours);
  // Test 4: Member 1 queries with text search
  const tasksSearch = await api.functional.erpHrm.member.projects.tasks.index(
    member1Connection,
    {
      projectId: projectA.id,
      body: {
        search: "implementation",
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(tasksSearch);
  // Test 5: Member 1 queries with different statuses
  const statuses: Array<"Open" | "In-Progress" | "Completed" | "Closed"> = [
    "Open",
    "In-Progress",
  ];
  for (const status of statuses) {
    const tasksByStatus =
      await api.functional.erpHrm.member.projects.tasks.index(
        member1Connection,
        {
          projectId: projectB.id,
          body: { status } satisfies IErpHrmTask.IRequest,
        },
      );
    typia.assert(tasksByStatus);
  }
  // Test 6: Authorization boundary - Member 2 (non-member) cannot access Project A tasks
  await TestValidator.error(
    "non-member should not access project tasks",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.index(
        member2Connection,
        {
          projectId: projectA.id,
          body: {} satisfies IErpHrmTask.IRequest,
        },
      );
    },
  );
  // Test 7: Member 2 cannot access Project B tasks either
  await TestValidator.error(
    "non-member should not access project B tasks",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.index(
        member2Connection,
        {
          projectId: projectB.id,
          body: { status: "Open" } satisfies IErpHrmTask.IRequest,
        },
      );
    },
  );
  // Test 8: Complex filter with parent task null (top-level tasks)
  const topLevelTasks = await api.functional.erpHrm.member.projects.tasks.index(
    member1Connection,
    {
      projectId: projectA.id,
      body: {
        parentTaskId: null,
        priority: "Critical",
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(topLevelTasks);
  // Test 9: Pagination validation - verify structure even with no results
  TestValidator.predicate(
    "pagination records non-negative",
    tasksProjectACombined.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    tasksProjectACombined.pagination.pages >= 0,
  );
}
