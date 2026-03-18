import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test pagination and date range filtering for task history retrieval.
 * 1. Member signup and organization setup
 * 2. Create employee and project
 * 3. Assign employee to project
 * 4. Create task
 * 5. Generate 10+ status changes for history records
 * 6. Test pagination (page 1, page 2 with limit 5)
 * 7. Test date range filtering (from, to, combined)
 * 8. Validate pagination metadata and filtering accuracy
 */
export async function test_api_task_history_pagination_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member signup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create employee (self)
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        role_id: organization.owner.id,
        employment_type: "full-time",
        status: "active",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Assign employee to project
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 6. Create task
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 7. Generate 10+ status changes for history records
  const statusCycle: Array<IHrmPlatformTask.IUpdate["status"]> = [
    "open",
    "in-progress",
    "completed",
    "closed",
    "open",
    "in-progress",
    "completed",
    "closed",
    "open",
    "in-progress",
    "completed",
    "closed",
  ];
  for (const status of statusCycle) {
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status } satisfies IHrmPlatformTask.IUpdate,
      },
    );
    // Small delay to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 8. Test pagination - page 1 with limit 5
  const page1Result =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.predicate(
    "page 1 has 5 records",
    page1Result.data.length === 5,
  );
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 total records >= 10",
    page1Result.pagination.records >= 10,
  );
  TestValidator.predicate(
    "page 1 total pages >= 2",
    page1Result.pagination.pages >= 2,
  );
  // Verify descending order (most recent first)
  if (page1Result.data.length >= 2) {
    TestValidator.predicate(
      "page 1 descending order",
      page1Result.data[0].created_at >= page1Result.data[1].created_at,
    );
  }
  // 9. Test pagination - page 2 with limit 5
  const page2Result =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.predicate(
    "page 2 has 5 records",
    page2Result.data.length === 5,
  );
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 5);
  TestValidator.equals(
    "page 2 total records",
    page2Result.pagination.records,
    page1Result.pagination.records,
  );
  TestValidator.equals(
    "page 2 total pages",
    page2Result.pagination.pages,
    page1Result.pagination.pages,
  );
  // Verify page 2 records are older than page 1 (with guard)
  if (page1Result.data.length > 0 && page2Result.data.length > 0) {
    const lastPage1Record = page1Result.data[page1Result.data.length - 1];
    const firstPage2Record = page2Result.data[0];
    TestValidator.predicate(
      "page 2 older than page 1",
      firstPage2Record.created_at <= lastPage1Record.created_at,
    );
  }
  // 10. Test date range filtering - created_at_from
  const fromDate = new Date(Date.now() - 50000).toISOString(); // ~50 seconds ago
  const fromFilteredResult =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 20,
          created_at_from: fromDate,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(fromFilteredResult);
  TestValidator.predicate(
    "from filter reduces records",
    fromFilteredResult.pagination.records <= page1Result.pagination.records,
  );
  TestValidator.predicate(
    "from filter has fewer or equal records",
    fromFilteredResult.data.length <= page1Result.data.length,
  );
  // 11. Test date range filtering - created_at_to
  const toDate = new Date().toISOString();
  const toFilteredResult =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 20,
          created_at_to: toDate,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(toFilteredResult);
  TestValidator.predicate(
    "to filter valid",
    toFilteredResult.pagination.records <= page1Result.pagination.records,
  );
  // 12. Test combined date range filtering
  const combinedFromDate = new Date(Date.now() - 30000).toISOString();
  const combinedToDate = new Date().toISOString();
  const combinedResult =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 20,
          created_at_from: combinedFromDate,
          created_at_to: combinedToDate,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter reduces records",
    combinedResult.pagination.records <= fromFilteredResult.pagination.records,
  );
  TestValidator.predicate(
    "combined has fewer records than from-only",
    combinedResult.data.length <= fromFilteredResult.data.length,
  );
  // 13. Test edge case - empty result with restrictive date range
  const restrictiveFromDate = new Date(Date.now() + 100000).toISOString(); // Future date
  const emptyResult =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 5,
          created_at_from: restrictiveFromDate,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("empty result data", emptyResult.data.length, 0);
  // 14. Test single page scenario
  const singlePageResult =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(singlePageResult);
  TestValidator.equals(
    "single page current",
    singlePageResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "single page pages",
    singlePageResult.pagination.pages <= 1,
  );
}
