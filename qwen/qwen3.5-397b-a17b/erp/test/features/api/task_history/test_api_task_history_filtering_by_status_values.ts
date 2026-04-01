import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test filtering task history entries by old_status and new_status values.
 *
 * This test creates a task and performs multiple status transitions to generate
 * history entries. It then tests filtering by:
 * 1. old_status - filter by previous status before transition
 * 2. new_status - filter by new status after transition
 * 3. Combined old_status and new_status - filter by both criteria
 *
 * Validates that filtered results contain only matching entries and pagination
 * metadata is correct.
 */
export async function test_api_task_history_filtering_by_status_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
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
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 4. Create initial task with status "open"
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 5. Perform multiple status transitions to create history entries
  // Transition 1: open -> in-progress
  const taskAfterTransition1 =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "in-progress" } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(taskAfterTransition1);
  // Transition 2: in-progress -> completed
  const taskAfterTransition2 =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "completed" } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(taskAfterTransition2);
  // Transition 3: completed -> closed
  const taskAfterTransition3 =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "closed" } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(taskAfterTransition3);
  // Transition 4: closed -> open (to have more variety)
  const taskAfterTransition4 =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "open" } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(taskAfterTransition4);
  // 6. Get all history entries (no filters)
  const allHistory =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at_asc",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  TestValidator.predicate("has history entries", allHistory.data.length >= 4);
  // 7. Test filtering by old_status = "in-progress"
  const historyFromInProgress =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          old_status: "in-progress",
          sort: "created_at_asc",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyFromInProgress);
  // Verify all entries have old_status = "in-progress"
  for (const entry of historyFromInProgress.data) {
    TestValidator.equals(
      "old_status is in-progress",
      entry.old_status,
      "in-progress",
    );
  }
  TestValidator.predicate(
    "has entries from in-progress",
    historyFromInProgress.data.length >= 1,
  );
  // 8. Test filtering by old_status = "completed"
  const historyFromCompleted =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          old_status: "completed",
          sort: "created_at_asc",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyFromCompleted);
  for (const entry of historyFromCompleted.data) {
    TestValidator.equals(
      "old_status is completed",
      entry.old_status,
      "completed",
    );
  }
  // 9. Test filtering by new_status = "completed"
  const historyToCompleted =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          new_status: "completed",
          sort: "created_at_asc",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyToCompleted);
  for (const entry of historyToCompleted.data) {
    TestValidator.equals(
      "new_status is completed",
      entry.new_status,
      "completed",
    );
  }
  TestValidator.predicate(
    "has entries to completed",
    historyToCompleted.data.length >= 1,
  );
  // 10. Test filtering by new_status = "closed"
  const historyToClosed =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          new_status: "closed",
          sort: "created_at_asc",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyToClosed);
  for (const entry of historyToClosed.data) {
    TestValidator.equals("new_status is closed", entry.new_status, "closed");
  }
  // 11. Test combined filtering: old_status = "in-progress" AND new_status = "completed"
  const historyCombined =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          old_status: "in-progress",
          new_status: "completed",
          sort: "created_at_asc",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyCombined);
  for (const entry of historyCombined.data) {
    TestValidator.equals(
      "old_status is in-progress (combined)",
      entry.old_status,
      "in-progress",
    );
    TestValidator.equals(
      "new_status is completed (combined)",
      entry.new_status,
      "completed",
    );
  }
  // 12. Test combined filtering: old_status = "completed" AND new_status = "closed"
  const historyCompletedToClosed =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          old_status: "completed",
          new_status: "closed",
          sort: "created_at_asc",
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyCompletedToClosed);
  for (const entry of historyCompletedToClosed.data) {
    TestValidator.equals(
      "old_status is completed",
      entry.old_status,
      "completed",
    );
    TestValidator.equals("new_status is closed", entry.new_status, "closed");
  }
  // 13. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page valid",
    allHistory.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    allHistory.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records valid",
    allHistory.pagination.records >= 4,
  );
  TestValidator.predicate(
    "pagination pages valid",
    allHistory.pagination.pages >= 1,
  );
  // 14. Verify filtered results have correct counts
  TestValidator.predicate(
    "filtered count <= total count",
    historyFromInProgress.data.length <= allHistory.data.length,
  );
  TestValidator.predicate(
    "combined filtered count <= single filtered count",
    historyCombined.data.length <= historyFromInProgress.data.length,
  );
}
