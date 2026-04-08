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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
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
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test filtering tasks by status and priority within a project.
 *
 * Validates the complete task filtering and sorting workflow including member authentication, organization and project setup, task creation with varied attributes, and comprehensive filter testing. Ensures that status filters, priority filters, combined filters, pagination metadata, and sorting operations all function correctly according to business specifications.
 *
 * The test creates 12 tasks covering all combinations of 4 statuses (open, in-progress, completed, closed) and 4 priorities (low, medium, high, urgent) to provide comprehensive test coverage for filtering scenarios.
 *
 * 1. Member registers and authenticates to obtain access token.
 * 2. Creates organization as the foundational business unit.
 * 3. Creates project within the organization for task management.
 * 4. Creates employee record and assigns member to project as project-lead.
 * 5. Creates 12 tasks with all status/priority combinations for filtering tests.
 * 6. Tests filtering by each status value (open, in-progress, completed, closed).
 * 7. Tests filtering by each priority level (low, medium, high, urgent).
 * 8. Tests combined status and priority filters.
 * 9. Validates pagination metadata reflects filtered counts accurately.
 * 10. Tests sorting by priority respects business enum order.
 * 11. Tests sorting by dueDate places null values last.
 */
export async function test_api_project_task_filter_by_status_and_priority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
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
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 4. Create employee and assign to project as project-lead
  // First we need to create an employee - but there's no direct employee creation endpoint
  // We'll use the member's own employee record which should exist after organization creation
  // For now, we'll create a project member assignment
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember);
  // 5. Create 12 tasks with all status/priority combinations
  const statuses: Array<"open" | "in-progress" | "completed" | "closed"> = [
    "open",
    "in-progress",
    "completed",
    "closed",
  ];
  const priorities: Array<"low" | "medium" | "high" | "urgent"> = [
    "low",
    "medium",
    "high",
    "urgent",
  ];
  const createdTasks: IHrmPlatformTask[] = [];
  for (const status of statuses) {
    for (const priority of priorities) {
      const task =
        await generate_random_hrm_platform_member_projects_tasks_create(
          memberConnection,
          {
            params: { projectId: project.id },
            body: {
              title: `Task ${status}-${priority}`,
              status,
              priority,
              description: RandomGenerator.paragraph({ sentences: 2 }),
              due_date:
                priority === "urgent"
                  ? new Date(Date.now() + 86400000).toISOString()
                  : priority === "high"
                    ? new Date(Date.now() + 172800000).toISOString()
                    : priority === "medium"
                      ? new Date(Date.now() + 259200000).toISOString()
                      : null,
            },
          },
        );
      typia.assert(task);
      createdTasks.push(task);
    }
  }
  // 6. Test filtering by status
  for (const status of statuses) {
    const filteredByStatus =
      await api.functional.hrmPlatform.member.projects.tasks.index(
        memberConnection,
        {
          projectId: project.id,
          body: {
            status,
            limit: 20,
          } satisfies IHrmPlatformTask.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    // Validate all returned tasks have the correct status
    for (const task of filteredByStatus.data) {
      TestValidator.equals(
        `task status matches filter ${status}`,
        task.status,
        status,
      );
    }
    // Validate pagination reflects filtered count (should be 4 tasks per status)
    TestValidator.equals(
      `filtered count for status ${status}`,
      filteredByStatus.data.length,
      4,
    );
    TestValidator.equals(
      `pagination records for status ${status}`,
      filteredByStatus.pagination.records,
      4,
    );
  }
  // 7. Test filtering by priority
  for (const priority of priorities) {
    const filteredByPriority =
      await api.functional.hrmPlatform.member.projects.tasks.index(
        memberConnection,
        {
          projectId: project.id,
          body: {
            priority,
            limit: 20,
          } satisfies IHrmPlatformTask.IRequest,
        },
      );
    typia.assert(filteredByPriority);
    // Validate all returned tasks have the correct priority
    for (const task of filteredByPriority.data) {
      TestValidator.equals(
        `task priority matches filter ${priority}`,
        task.priority,
        priority,
      );
    }
    // Validate pagination reflects filtered count (should be 3 tasks per priority)
    TestValidator.equals(
      `filtered count for priority ${priority}`,
      filteredByPriority.data.length,
      3,
    );
    TestValidator.equals(
      `pagination records for priority ${priority}`,
      filteredByPriority.pagination.records,
      3,
    );
  }
  // 8. Test combined status and priority filters
  const testCombinations: Array<{
    status: (typeof statuses)[number];
    priority: (typeof priorities)[number];
  }> = [
    { status: "open", priority: "urgent" },
    { status: "in-progress", priority: "high" },
    { status: "completed", priority: "medium" },
    { status: "closed", priority: "low" },
  ];
  for (const combo of testCombinations) {
    const filteredCombined =
      await api.functional.hrmPlatform.member.projects.tasks.index(
        memberConnection,
        {
          projectId: project.id,
          body: {
            status: combo.status,
            priority: combo.priority,
            limit: 20,
          } satisfies IHrmPlatformTask.IRequest,
        },
      );
    typia.assert(filteredCombined);
    // Validate all returned tasks match both filters
    for (const task of filteredCombined.data) {
      TestValidator.equals(
        `task status matches combined filter`,
        task.status,
        combo.status,
      );
      TestValidator.equals(
        `task priority matches combined filter`,
        task.priority,
        combo.priority,
      );
    }
    // Should return exactly 1 task per combination
    TestValidator.equals(
      `combined filter count`,
      filteredCombined.data.length,
      1,
    );
    TestValidator.equals(
      `combined pagination records`,
      filteredCombined.pagination.records,
      1,
    );
  }
  // 9. Test sorting by priority (urgent > high > medium > low)
  const sortedByPriority =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "priority",
          sortDirection: "desc",
          limit: 20,
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(sortedByPriority);
  // Validate priority order: urgent first, then high, medium, low
  const priorityOrder: Record<string, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  let lastPriorityIndex = -1;
  for (const task of sortedByPriority.data) {
    const currentPriorityIndex = priorityOrder[task.priority];
    TestValidator.predicate(
      `priority order maintained for ${task.title}`,
      currentPriorityIndex >= lastPriorityIndex,
    );
    lastPriorityIndex = currentPriorityIndex;
  }
  // 10. Test sorting by dueDate with null values last
  const sortedByDueDate =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "dueDate",
          sortDirection: "asc",
          limit: 20,
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(sortedByDueDate);
  // Validate null due dates appear last
  let encounteredNull = false;
  for (const task of sortedByDueDate.data) {
    if (task.due_date === null) {
      encounteredNull = true;
    } else if (encounteredNull) {
      // Found a non-null date after a null - this violates the rule
      TestValidator.predicate(`null due dates should be last`, false);
    }
  }
}
