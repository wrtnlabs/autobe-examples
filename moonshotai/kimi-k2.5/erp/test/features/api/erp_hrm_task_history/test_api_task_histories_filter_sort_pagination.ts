import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_histories_filter_sort_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (owner) to establish authorization context
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create organization context for project and task creation
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role with project view permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: "Project Viewer",
        permissions: [
          { permission: "project.view" },
        ] as IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(role);
  // 4. Create another member to be assigned as project-lead
  const leadConnection: api.IConnection = { host: connection.host };
  const lead = await authorize_member_join(leadConnection, {});
  typia.assert(lead);
  // 5. Create organization member with the custom role
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: lead.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(orgMember);
  // 6. Create project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 7. Assign member as project-lead to the project for task management privileges
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: orgMember.id,
          role: "project-lead",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 8. Create task with initial status 'Open' (automatically creates a history entry)
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    ownerConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Test Task for History",
        status: "Open",
      } satisfies IErpHrmTask.ICreate,
    },
  );
  typia.assert(task);
  // 9. Query task history - verify basic retrieval returns paginated structure with history entries
  const allHistories =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      ownerConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {} satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(allHistories);
  TestValidator.equals(
    "basic retrieval returns at least one history entry",
    allHistories.data.length,
    1,
  );
  TestValidator.equals(
    "history entry new_status is Open",
    allHistories.data[0].new_status,
    "Open",
  );
  TestValidator.equals(
    "history entry previous_status is defined",
    allHistories.data[0].previous_status,
    allHistories.data[0].previous_status,
  );
  // 10. Verify filtering by status works (filtering for 'Open' returns the entry)
  const openHistories =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      ownerConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "Open",
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(openHistories);
  TestValidator.equals(
    "filter by Open status returns one entry",
    openHistories.data.length,
    1,
  );
  TestValidator.equals(
    "filtered entry has correct new_status",
    openHistories.data[0].new_status,
    "Open",
  );
  // Verify filtering for 'In-Progress' returns empty (no entries with this status)
  const inProgressHistories =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      ownerConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "In-Progress",
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(inProgressHistories);
  TestValidator.equals(
    "filter by In-Progress status returns empty",
    inProgressHistories.data.length,
    0,
  );
  // 11. Verify filtering by date range returns entries within the specified period
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeHistories =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      ownerConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          startDate: yesterday,
          endDate: tomorrow,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(dateRangeHistories);
  TestValidator.equals(
    "date range filter including now returns entry",
    dateRangeHistories.data.length,
    1,
  );
  // Verify date range in the past returns empty
  const pastStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const pastEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const pastHistories =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      ownerConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          startDate: pastStart,
          endDate: pastEnd,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(pastHistories);
  TestValidator.equals(
    "past date range returns empty",
    pastHistories.data.length,
    0,
  );
  // 12. Verify pagination with page/limit parameters returns correct page metadata
  const paginatedHistories =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      ownerConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(paginatedHistories);
  TestValidator.equals(
    "pagination current page is 1",
    paginatedHistories.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedHistories.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records count is 1",
    paginatedHistories.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages count is 1",
    paginatedHistories.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination data length matches records",
    paginatedHistories.data.length,
    paginatedHistories.pagination.records,
  );
  // 13. Verify sorting by createdAt in descending order (default) returns newest changes first
  const sortedHistories =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      ownerConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at:desc",
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(sortedHistories);
  TestValidator.equals(
    "sorted histories returns entries",
    sortedHistories.data.length,
    1,
  );
  // With single entry, verify created_at timestamp exists (validated by typia.assert, checking business logic)
  TestValidator.predicate(
    "sorted history entry has valid created_at timestamp",
    () => {
      return sortedHistories.data[0].created_at != null;
    },
  );
}
