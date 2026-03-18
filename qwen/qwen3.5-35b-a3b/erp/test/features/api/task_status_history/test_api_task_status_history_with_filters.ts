import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTaskStatusHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_organizations_tasks_create } from "../../../generate/generate_random_hrms_member_organizations_tasks_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_status_history_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create organization (member creates their own organization during join)
  const organizationId = authorized.organization_memberships[0].organization.id;
  // 3. Create project within organization
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        },
      },
    );
  typia.assert(project);
  // 4. Create task within project
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const task = await api.functional.hrms.member.organizations.tasks.create(
    memberConnection,
    {
      projectId: projectId,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 5. Change task status multiple times to create history entries
  // First change: open -> in-progress
  await api.functional.hrms.member.projects.tasks.update(memberConnection, {
    projectId: projectId,
    taskId: taskId,
    body: { status: "in-progress" } satisfies IHrmsTask.IUpdate,
  });
  // Second change: in-progress -> completed
  await api.functional.hrms.member.projects.tasks.update(memberConnection, {
    projectId: projectId,
    taskId: taskId,
    body: { status: "completed" } satisfies IHrmsTask.IUpdate,
  });
  // Get all history entries first to establish baseline
  const allHistory =
    await api.functional.hrms.member.projects.tasks.status_history.statusHistory(
      memberConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {},
      },
    );
  typia.assert(allHistory);
  if (allHistory.data.length === 0) {
    throw new Error("No status history entries found for testing");
  }
  // Use the earliest and latest entry timestamps for date range filtering
  const minDate = allHistory.data[0].created_at;
  const maxDate = allHistory.data[allHistory.data.length - 1].created_at;
  // 6. Query status history with date range filter only (middle entries)
  const midDate =
    allHistory.data[Math.floor(allHistory.data.length / 2)].created_at;
  const historyWithDateFilter =
    await api.functional.hrms.member.projects.tasks.status_history.statusHistory(
      memberConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          startDate: midDate,
          endDate: maxDate,
        },
      },
    );
  typia.assert(historyWithDateFilter);
  // Validate all entries fall within date range
  for (const entry of historyWithDateFilter.data) {
    TestValidator.predicate(
      "entry created_at within startDate",
      new Date(entry.created_at) >= new Date(midDate),
    );
    TestValidator.predicate(
      "entry created_at within endDate",
      new Date(entry.created_at) <= new Date(maxDate),
    );
  }
  // 7. Query status history with status type filter (only completed)
  const historyWithStatusFilter =
    await api.functional.hrms.member.projects.tasks.status_history.statusHistory(
      memberConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          newStatus: "completed",
        },
      },
    );
  typia.assert(historyWithStatusFilter);
  // Validate all entries match the requested status
  for (const entry of historyWithStatusFilter.data) {
    TestValidator.equals(
      "entry new_status matches filter",
      entry.new_status,
      "completed",
    );
  }
  // 8. Query status history with both date range and status type filters
  const historyWithBothFilters =
    await api.functional.hrms.member.projects.tasks.status_history.statusHistory(
      memberConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          startDate: midDate,
          endDate: maxDate,
          newStatus: "completed",
        },
      },
    );
  typia.assert(historyWithBothFilters);
  // Validate all entries match both filters
  for (const entry of historyWithBothFilters.data) {
    TestValidator.predicate(
      "entry created_at within date range",
      new Date(entry.created_at) >= new Date(midDate) &&
        new Date(entry.created_at) <= new Date(maxDate),
    );
    TestValidator.equals(
      "entry new_status matches status filter",
      entry.new_status,
      "completed",
    );
  }
  // 9. Validate pagination metadata reflects filtered results
  TestValidator.predicate(
    "pagination records count is non-negative",
    historyWithDateFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    historyWithDateFilter.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination records count matches data length",
    historyWithDateFilter.pagination.records,
    historyWithDateFilter.data.length,
  );
  // 10. Query with cursor-based pagination to verify consistency
  if (historyWithDateFilter.data.length > 0) {
    const lastEntryDate =
      historyWithDateFilter.data[historyWithDateFilter.data.length - 1]
        .created_at;
    const cursorHistory =
      await api.functional.hrms.member.projects.tasks.status_history.statusHistory(
        memberConnection,
        {
          projectId: projectId,
          taskId: taskId,
          body: {
            startDate: midDate,
            endDate: maxDate,
            cursor: lastEntryDate,
            reverse: false,
          },
        },
      );
    typia.assert(cursorHistory);
    // Validate cursor pagination continues correctly
    for (const entry of cursorHistory.data) {
      TestValidator.predicate(
        "cursor entry created_at within date range",
        new Date(entry.created_at) >= new Date(midDate) &&
          new Date(entry.created_at) <= new Date(maxDate),
      );
    }
  }
}
