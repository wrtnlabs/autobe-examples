import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test task history retrieval with complete status change tracking.
 * 1. Member authenticates to access task history endpoint
 * 2. Create a project for the member's organization
 * 3. Create a task in the project
 * 4. Update task status multiple times to generate history entries
 * 5. Retrieve all task history entries
 * 6. Validate pagination, entry structure, and status progression
 */
export async function test_api_task_history_retrieve_all_entries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        color_code: "#3B82F6",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create a task in the project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "medium",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 4. Update task status multiple times to generate history entries
  // First update: open -> in-progress
  const updatedTask1 = await api.functional.hrmPlatform.member.tasks.update(
    memberConnection,
    {
      taskId: task.id,
      body: {
        status: "in-progress",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask1);
  // Second update: in-progress -> completed
  const updatedTask2 = await api.functional.hrmPlatform.member.tasks.update(
    memberConnection,
    {
      taskId: task.id,
      body: {
        status: "completed",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask2);
  // Third update: completed -> closed
  const updatedTask3 = await api.functional.hrmPlatform.member.tasks.update(
    memberConnection,
    {
      taskId: task.id,
      body: {
        status: "closed",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask3);
  // 5. Retrieve all task history entries
  const history = await api.functional.hrmPlatform.member.task_histories.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformTaskHistory.IRequest,
    },
  );
  typia.assert(history);
  // 6. Validate pagination metadata
  TestValidator.equals("current page is 1", history.pagination.current, 1);
  TestValidator.equals("limit is 20", history.pagination.limit, 20);
  TestValidator.predicate(
    "has pagination records",
    history.pagination.records >= 3,
  );
  TestValidator.predicate(
    "has at least one page",
    history.pagination.pages >= 1,
  );
  // 7. Validate history entries count matches status changes
  TestValidator.equals(
    "history entries count matches status changes",
    history.data.length,
    3,
  );
  // 8. Validate each history entry structure and content
  await ArrayUtil.asyncForEach(history.data, async (entry, index) => {
    // Validate task information
    typia.assert(entry.task);
    TestValidator.equals(
      `entry ${index} task id matches`,
      entry.task.id,
      task.id,
    );
    TestValidator.predicate(
      `entry ${index} task title is non-empty`,
      entry.task.title.length > 0,
    );
    // Validate member information
    typia.assert(entry.member);
    TestValidator.equals(
      `entry ${index} member id matches`,
      entry.member.id,
      member.id,
    );
    TestValidator.predicate(
      `entry ${index} member email is valid`,
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.member.email),
    );
    // Validate status fields are non-empty
    TestValidator.predicate(
      `entry ${index} old_status is non-empty`,
      entry.old_status.length > 0,
    );
    TestValidator.predicate(
      `entry ${index} new_status is non-empty`,
      entry.new_status.length > 0,
    );
    // Validate timestamp is valid
    TestValidator.predicate(
      `entry ${index} created_at is valid date-time`,
      !isNaN(Date.parse(entry.created_at)),
    );
  });
  // 9. Validate entries are sorted by created_at in descending order
  for (let i = 1; i < history.data.length; i++) {
    TestValidator.predicate(
      `entry ${i} created_at <= entry ${i - 1} created_at`,
      new Date(history.data[i].created_at).getTime() <=
        new Date(history.data[i - 1].created_at).getTime(),
    );
  }
  // 10. Validate status progression
  TestValidator.equals(
    "first entry old_status is open",
    history.data[0].old_status,
    "open",
  );
  TestValidator.equals(
    "first entry new_status is in-progress",
    history.data[0].new_status,
    "in-progress",
  );
  TestValidator.equals(
    "second entry old_status is in-progress",
    history.data[1].old_status,
    "in-progress",
  );
  TestValidator.equals(
    "second entry new_status is completed",
    history.data[1].new_status,
    "completed",
  );
  TestValidator.equals(
    "third entry old_status is completed",
    history.data[2].old_status,
    "completed",
  );
  TestValidator.equals(
    "third entry new_status is closed",
    history.data[2].new_status,
    "closed",
  );
}
