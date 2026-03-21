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
import type { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_history_filtering_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#3A5BF0" as string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create task
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
  // 4. First status transition: open -> in-progress
  const transition1 = await api.functional.erpHrm.member.projects.tasks.update(
    memberConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: { status: "in-progress" } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(transition1);
  TestValidator.equals(
    "status is in-progress",
    transition1.status,
    "in-progress",
  );
  // Capture timestamp after first transition
  const afterFirstTransition = new Date().toISOString();
  // Wait a small moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Second status transition: in-progress -> completed
  const transition2 = await api.functional.erpHrm.member.projects.tasks.update(
    memberConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: { status: "completed" } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(transition2);
  TestValidator.equals("status is completed", transition2.status, "completed");
  // 6. Third status transition: completed -> closed
  await api.functional.erpHrm.member.projects.tasks.update(memberConnection, {
    projectId: project.id,
    taskId: task.id,
    body: { status: "closed" } satisfies IErpHrmTask.IUpdate,
  });
  // Get all history entries (no filter)
  const allHistory =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {} satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  TestValidator.predicate("has history entries", allHistory.data.length >= 3);
  // 7. Test filtering by new_status='in-progress'
  const filteredByNewStatus =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          new_status: "in-progress",
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByNewStatus);
  TestValidator.equals(
    "only in-progress entries",
    filteredByNewStatus.data.length,
    1,
  );
  if (filteredByNewStatus.data.length > 0) {
    TestValidator.equals(
      "new_status is in-progress",
      filteredByNewStatus.data[0].newStatus,
      "in-progress",
    );
  }
  // 8. Test filtering by new_status='completed'
  const filteredByCompleted =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          new_status: "completed",
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByCompleted);
  TestValidator.equals(
    "only completed entries",
    filteredByCompleted.data.length,
    1,
  );
  if (filteredByCompleted.data.length > 0) {
    TestValidator.equals(
      "new_status is completed",
      filteredByCompleted.data[0].newStatus,
      "completed",
    );
  }
  // 9. Test filtering by previous_status='open'
  const filteredByPreviousOpen =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          previous_status: "open",
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByPreviousOpen);
  TestValidator.equals(
    "only entries with previous_status=open",
    filteredByPreviousOpen.data.length,
    1,
  );
  if (filteredByPreviousOpen.data.length > 0) {
    TestValidator.equals(
      "previous_status is open",
      filteredByPreviousOpen.data[0].previousStatus,
      "open",
    );
  }
  // 10. Test filtering by previous_status='in-progress'
  const filteredByPreviousInProgress =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          previous_status: "in-progress",
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByPreviousInProgress);
  TestValidator.equals(
    "only entries with previous_status=in-progress",
    filteredByPreviousInProgress.data.length,
    1,
  );
  if (filteredByPreviousInProgress.data.length > 0) {
    TestValidator.equals(
      "previous_status is in-progress",
      filteredByPreviousInProgress.data[0].previousStatus,
      "in-progress",
    );
  }
  // 11. Test date range filter: created_at_after
  const filteredByAfter =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          created_at_after: afterFirstTransition,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByAfter);
  // Should only include completed and closed transitions (not in-progress)
  TestValidator.predicate(
    "entries after first transition",
    filteredByAfter.data.length <= 2,
  );
  // 12. Test combined filter: new_status='completed'
  const filteredCombined =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          new_status: "completed",
          previous_status: "in-progress",
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(filteredCombined);
  TestValidator.equals(
    "combined filter returns correct entry",
    filteredCombined.data.length,
    1,
  );
  if (filteredCombined.data.length > 0) {
    TestValidator.equals(
      "new_status is completed",
      filteredCombined.data[0].newStatus,
      "completed",
    );
    TestValidator.equals(
      "previous_status is in-progress",
      filteredCombined.data[0].previousStatus,
      "in-progress",
    );
  }
  // 13. Verify chronological order is maintained
  for (let i = 1; i < allHistory.data.length; i++) {
    const prev = new Date(allHistory.data[i - 1].createdAt).getTime();
    const curr = new Date(allHistory.data[i].createdAt).getTime();
    TestValidator.predicate("chronological order maintained", prev <= curr);
  }
}
