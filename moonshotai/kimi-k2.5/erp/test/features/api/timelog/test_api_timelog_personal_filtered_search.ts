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
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_personal_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create organization member record for current user
  await generate_random_erp_hrm_member_organization_members_create(
    memberConnection,
    {
      body: {
        organizationId: organization.id,
        userId: authorizedMember.id,
        employmentType: "full_time",
        isActive: true,
      },
    },
  );
  // 4. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  // 5. Create task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  // 6. Create timelog entries with different attributes
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Billable timelog with task (recent)
  const billableTimelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        start_time: yesterday.toISOString(),
        end_time: now.toISOString(),
        billable: true,
        description: "Billable work on task",
      },
    },
  );
  // Non-billable timelog without task (older)
  const nonBillableTimelog =
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        project_id: project.id,
        task_id: null,
        start_time: lastWeek.toISOString(),
        end_time: twoDaysAgo.toISOString(),
        billable: false,
        description: "Non-billable internal work",
      },
    });
  // 7. Search timelogs with project filter and date range
  const searchResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        projectId: project.id,
        startDateFrom: lastWeek.toISOString(),
        startDateTo: now.toISOString(),
        sortBy: "start_time",
        sortDirection: "desc",
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(searchResult);
  // 8. Validate search results
  // Verify pagination metadata exists
  TestValidator.predicate(
    "pagination has current page",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    searchResult.pagination.pages >= 0,
  );
  // Verify all results belong to the filtered project
  TestValidator.predicate(
    "all timelogs belong to filtered project",
    searchResult.data.every((t) => t.project.id === project.id),
  );
  // Verify sorting by start_time descending (most recent first)
  if (searchResult.data.length >= 2) {
    for (let i = 0; i < searchResult.data.length - 1; i++) {
      const currentStartTime = new Date(
        searchResult.data[i].startTime,
      ).getTime();
      const nextStartTime = new Date(
        searchResult.data[i + 1].startTime,
      ).getTime();
      TestValidator.predicate(
        `timelog ${i} start_time >= timelog ${i + 1} start_time`,
        currentStartTime >= nextStartTime,
      );
    }
  }
  // Verify related data is populated (project summary)
  TestValidator.predicate(
    "timelogs have project summary",
    searchResult.data.every(
      (t) =>
        t.project !== undefined &&
        t.project.id !== undefined &&
        t.project.name !== undefined,
    ),
  );
  // 9. Test billable filter
  const billableResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        projectId: project.id,
        billable: true,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(billableResult);
  TestValidator.predicate(
    "billable filter returns only billable timelogs",
    billableResult.data.every((t) => t.billable === true),
  );
  TestValidator.predicate(
    "billable result contains the billable timelog",
    billableResult.data.some((t) => t.id === billableTimelog.id),
  );
  // 10. Test non-billable filter (implicitly by checking exclusion)
  TestValidator.predicate(
    "non-billable timelog not in billable results",
    !billableResult.data.some((t) => t.id === nonBillableTimelog.id),
  );
  // 11. Test task filter (timelogs without task assignment)
  const noTaskResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        projectId: project.id,
        taskId: null,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(noTaskResult);
  TestValidator.predicate(
    "taskId null filter returns timelogs without task",
    noTaskResult.data.every((t) => t.task === null),
  );
  TestValidator.predicate(
    "no-task result contains non-billable timelog",
    noTaskResult.data.some((t) => t.id === nonBillableTimelog.id),
  );
  // 12. Verify data array structure
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  TestValidator.predicate(
    "data length does not exceed limit",
    searchResult.data.length <= searchResult.pagination.limit,
  );
}
