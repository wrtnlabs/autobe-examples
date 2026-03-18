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
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_list_filtered_search_with_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as member
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 5. Start a timer with specific description for search testing
  const specificDescription = "specific timer description for search testing";
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        description: specificDescription,
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 6. Test filtering by projectId - returns only timers for that specific project
  const projectFilterResult = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        projectId: project.id,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(projectFilterResult);
  TestValidator.predicate(
    "project filter returns results",
    projectFilterResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results match project filter",
    projectFilterResult.data.every((t) => t.project.id === project.id),
  );
  // 7. Test filtering by taskId - returns timers for that specific task
  const taskFilterResult = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        taskId: task.id,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(taskFilterResult);
  TestValidator.predicate(
    "task filter returns results",
    taskFilterResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results match task filter",
    taskFilterResult.data.every((t) => t.task?.id === task.id),
  );
  // 8. Test partial text search on description with case-insensitive trigram matching
  const descriptionFilterResult =
    await api.functional.erpHrm.member.timers.index(memberConnection, {
      body: {
        description: "specific timer",
      } satisfies IErpHrmTimer.IRequest,
    });
  typia.assert(descriptionFilterResult);
  TestValidator.predicate(
    "description filter returns results",
    descriptionFilterResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results match description filter",
    descriptionFilterResult.data.every((t) =>
      t.description?.toLowerCase().includes("specific timer"),
    ),
  );
  // 9. Test combined filters (project + description) with AND logic
  const combinedFilterResult = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        projectId: project.id,
        description: specificDescription,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter returns results",
    combinedFilterResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results match combined filters",
    combinedFilterResult.data.every(
      (t) =>
        t.project.id === project.id && t.description === specificDescription,
    ),
  );
  // 10. Test time range filtering (startedAtFrom and startedAtUntil)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const timeRangeResult = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        startedAtFrom: yesterday.toISOString(),
        startedAtUntil: tomorrow.toISOString(),
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(timeRangeResult);
  TestValidator.predicate(
    "time range filter returns results",
    timeRangeResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results are within time range",
    timeRangeResult.data.every((t) => {
      const startedAt = new Date(t.startedAt);
      return startedAt >= yesterday && startedAt <= tomorrow;
    }),
  );
  // 11. Verify no results are returned when filters don't match any records
  const nonExistentProjectId = typia.random<string & tags.Format<"uuid">>();
  const noMatchResult = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        projectId: nonExistentProjectId,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no results for non-matching filter",
    noMatchResult.data.length,
    0,
  );
}
