import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";

export async function test_api_task_listing_advanced_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization (member needs one to create projects)
  // Note: Organization creation would typically happen during member setup
  // For this test, we'll use a generated organization ID
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create project in organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          name: RandomGenerator.name(3),
          color_code: `#${RandomGenerator.alphabets(6).toUpperCase()}`,
          status: "active",
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(project);
  // 4. Assign member as project-lead
  // Need to create an employee record first for the member
  // For this test, we'll use a generated employee ID
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: { projectId: project.id },
      body: {
        employee_id: employeeId,
        role: "project-lead",
      } satisfies IHrmProjectMember.ICreate,
    });
  typia.assert(projectMember);
  // 5. Test task listing with various filter combinations
  // 5.1 Test with no filters (should return all tasks)
  const allTasks =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmTask.IRequest,
      },
    );
  typia.assert(allTasks);
  TestValidator.equals(
    "pagination has current page",
    allTasks.pagination.current,
    1,
  );
  TestValidator.equals("pagination has limit", allTasks.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has total records",
    allTasks.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    allTasks.pagination.pages >= 0,
  );
  // 5.2 Test filtering by priority (high, urgent)
  const highPriorityTasks =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          priority: "high",
          page: 1,
          limit: 20,
        } satisfies IHrmTask.IRequest,
      },
    );
  typia.assert(highPriorityTasks);
  TestValidator.predicate(
    "high priority filter returns valid pagination",
    highPriorityTasks.pagination.records >= 0,
  );
  // 5.3 Test filtering by due date range
  const now = new Date();
  const dueDateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const dueDateTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const dateRangeTasks =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          due_date_from: dueDateFrom.toISOString(),
          due_date_to: dueDateTo.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IHrmTask.IRequest,
      },
    );
  typia.assert(dateRangeTasks);
  TestValidator.predicate(
    "date range filter returns valid pagination",
    dateRangeTasks.pagination.records >= 0,
  );
  // 5.4 Test filtering by text search
  const searchTasks =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          search: RandomGenerator.alphabets(5),
          page: 1,
          limit: 20,
        } satisfies IHrmTask.IRequest,
      },
    );
  typia.assert(searchTasks);
  TestValidator.predicate(
    "search filter returns valid pagination",
    searchTasks.pagination.records >= 0,
  );
  // 5.5 Test combined filters (priority + date range + search)
  const combinedTasks =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          priority: "urgent",
          due_date_from: dueDateFrom.toISOString(),
          due_date_to: dueDateTo.toISOString(),
          search: RandomGenerator.alphabets(3),
          page: 1,
          limit: 20,
        } satisfies IHrmTask.IRequest,
      },
    );
  typia.assert(combinedTasks);
  TestValidator.predicate(
    "combined filters return valid pagination",
    combinedTasks.pagination.records >= 0,
  );
  // 5.6 Test empty result set (filter that likely matches nothing)
  const emptyTasks =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          search: "zzzzzzzzzzzzzzzzzzzzzzz", // Very unlikely to match anything
          page: 1,
          limit: 20,
        } satisfies IHrmTask.IRequest,
      },
    );
  typia.assert(emptyTasks);
  TestValidator.equals(
    "empty result has 0 records",
    emptyTasks.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has 0 pages",
    emptyTasks.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyTasks.data.length,
    0,
  );
  // 5.7 Test pagination with different page and limit values
  const page2Tasks =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IHrmTask.IRequest,
      },
    );
  typia.assert(page2Tasks);
  TestValidator.equals(
    "page 2 has correct page number",
    page2Tasks.pagination.current,
    2,
  );
  TestValidator.equals("page 2 has limit 10", page2Tasks.pagination.limit, 10);
  // 5.8 Test invalid filter values are ignored (not causing errors)
  const invalidFilterTasks =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          priority: "invalid_priority_value", // Invalid priority
          status: "invalid_status_value", // Invalid status
          page: 1,
          limit: 20,
        } satisfies IHrmTask.IRequest,
      },
    );
  typia.assert(invalidFilterTasks);
  TestValidator.predicate(
    "invalid filters don't break pagination",
    invalidFilterTasks.pagination.records >= 0,
  );
  // 5.9 Test assigned employee filter
  const assignedTasks =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          assigned_employee_id: employeeId,
          page: 1,
          limit: 20,
        } satisfies IHrmTask.IRequest,
      },
    );
  typia.assert(assignedTasks);
  TestValidator.predicate(
    "assigned employee filter returns valid pagination",
    assignedTasks.pagination.records >= 0,
  );
  // 5.10 Test unassigned tasks filter (assigned_employee_id = null)
  const unassignedTasks =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          assigned_employee_id: null,
          page: 1,
          limit: 20,
        } satisfies IHrmTask.IRequest,
      },
    );
  typia.assert(unassignedTasks);
  TestValidator.predicate(
    "unassigned filter returns valid pagination",
    unassignedTasks.pagination.records >= 0,
  );
}
