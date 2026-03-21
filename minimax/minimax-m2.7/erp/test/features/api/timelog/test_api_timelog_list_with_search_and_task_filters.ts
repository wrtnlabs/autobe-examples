import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_list_with_search_and_task_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create project for timelog and task association
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Add member as project member
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  // 4. Create task for task-based timelog filtering
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(task);
  // 5. Create timelog with searchable description (unique term for search)
  const uniqueSearchTerm = `UNIQUE_SEARCH_${RandomGenerator.alphaNumeric(8)}`;
  const timelogWithSearch =
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        description: `This is a ${uniqueSearchTerm} task description`,
        billable: true,
      },
    });
  typia.assert(timelogWithSearch);
  // 6. Create another timelog with different description (should not match search)
  const timelogDifferent = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        description: "Completely different description without the search term",
        billable: false,
      },
    },
  );
  typia.assert(timelogDifferent);
  // 7. Create timelog with task association
  const timelogWithTask = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: new Date().toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        description: "Timelog associated with a task",
        billable: true,
      },
    },
  );
  typia.assert(timelogWithTask);
  // 8. Create timelog without task association
  const timelogNoTask = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        description: "Timelog without task association",
        billable: false,
      },
    },
  );
  typia.assert(timelogNoTask);
  // 9. Query with text search filter matching only timelogWithSearch
  const searchByTermResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        search: `${uniqueSearchTerm}.*` satisfies string & tags.Format<"regex">,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(searchByTermResult);
  // Validate search returns the matching timelog
  TestValidator.equals(
    "search returns matching timelog",
    searchByTermResult.data.some((t) => t.id === timelogWithSearch.id),
    true,
  );
  TestValidator.equals(
    "search excludes non-matching timelog",
    searchByTermResult.data.some((t) => t.id === timelogDifferent.id),
    false,
  );
  // 10. Query with task_id filter to verify task-associated timelogs are correctly filtered
  const taskFilterResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        task_id: task.id,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(taskFilterResult);
  // Validate task filter returns only timelog with that task
  TestValidator.equals(
    "task filter returns timelog with task",
    taskFilterResult.data.some((t) => t.id === timelogWithTask.id),
    true,
  );
  TestValidator.equals(
    "task filter excludes timelog without task",
    taskFilterResult.data.some((t) => t.id === timelogNoTask.id),
    false,
  );
  // 11. Query with project_id filter to validate project filtering
  const projectFilterResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        project_id: project.id,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(projectFilterResult);
  // Validate all created timelogs appear in project filter
  TestValidator.predicate(
    "project filter includes all timelogs from project",
    projectFilterResult.data.length >= 4,
  );
  // 12. Validate pagination works correctly with filters
  const paginatedResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        project_id: project.id,
        page: 1,
        limit: 2,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(paginatedResult);
  // Validate pagination structure
  TestValidator.equals("page is 1", paginatedResult.pagination.current, 1);
  TestValidator.equals("limit is 2", paginatedResult.pagination.limit, 2);
  TestValidator.predicate(
    "total records >= 4",
    paginatedResult.pagination.records >= 4,
  );
  TestValidator.predicate(
    "has multiple pages",
    paginatedResult.pagination.pages > 1,
  );
  // 13. Validate response includes all expected summary fields
  const firstTimelog = paginatedResult.data[0];
  if (firstTimelog) {
    // Validate required fields exist
    TestValidator.predicate("has id", !!firstTimelog.id);
    TestValidator.predicate("has date", !!firstTimelog.date);
    TestValidator.predicate(
      "has duration_minutes",
      firstTimelog.duration_minutes !== undefined,
    );
    TestValidator.predicate(
      "has billable",
      firstTimelog.billable !== undefined,
    );
    TestValidator.predicate("has employee", !!firstTimelog.employee);
    TestValidator.predicate(
      "has project nested object",
      !!firstTimelog.project,
    );
    // Validate project nested object
    TestValidator.predicate("project has id", !!firstTimelog.project.id);
    TestValidator.predicate("project has name", !!firstTimelog.project.name);
    TestValidator.predicate("project has color", !!firstTimelog.project.color);
    TestValidator.predicate(
      "project has status",
      !!firstTimelog.project.status,
    );
    // Validate employee nested object
    TestValidator.predicate("employee has id", !!firstTimelog.employee.id);
    TestValidator.predicate(
      "employee has member",
      !!firstTimelog.employee.member,
    );
  }
  // 14. Validate billable filter
  const billableFilterResult =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        billable: true,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(billableFilterResult);
  // All results should be billable
  TestValidator.predicate(
    "billable filter returns only billable timelogs",
    billableFilterResult.data.every((t) => t.billable === true),
  );
  // 15. Combine multiple filters
  const combinedFilterResult =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        project_id: project.id,
        billable: true,
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(combinedFilterResult);
  // All results should match combined filters
  TestValidator.predicate(
    "combined filter returns correct timelogs",
    combinedFilterResult.data.every((t) => t.billable === true),
  );
}
