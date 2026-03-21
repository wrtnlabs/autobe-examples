import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_history_status_change_view(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving task status change history for a task within a project.
   * Validates that project members can view task history entries with proper
   * pagination and data structure.
   */
  // 1. Create member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a project
  const hexDigits = "0123456789ABCDEF";
  const hexColor = Array.from(
    { length: 6 },
    () => hexDigits[Math.floor(Math.random() * 16)],
  ).join("");
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: `#${hexColor}`,
        budget_hours: typia.random<number & tags.Minimum<0>>(),
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        estimated_hours: typia.random<number & tags.Minimum<0>>(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(task);
  // 4. Retrieve task history
  const historyResponse =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 5. Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    historyResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    historyResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    historyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    historyResponse.pagination.pages >= 0,
  );
  // 6. Verify history entries structure
  for (const historyEntry of historyResponse.data) {
    // Validate UUID format for id
    TestValidator.predicate(
      "history entry has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        historyEntry.id,
      ),
    );
    // Validate status values
    TestValidator.predicate(
      "previousStatus is valid status",
      ["open", "in-progress", "completed", "closed"].includes(
        historyEntry.previousStatus,
      ),
    );
    TestValidator.predicate(
      "newStatus is valid status",
      ["open", "in-progress", "completed", "closed"].includes(
        historyEntry.newStatus,
      ),
    );
    // Validate member information exists
    TestValidator.predicate(
      "member has id",
      historyEntry.member.id !== null && historyEntry.member.id !== undefined,
    );
    TestValidator.predicate(
      "member has displayName",
      historyEntry.member.displayName !== null &&
        historyEntry.member.displayName !== undefined,
    );
    // Validate createdAt timestamp
    TestValidator.predicate(
      "createdAt is valid ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(historyEntry.createdAt),
    );
  }
  // 7. Verify history entries are sorted by createdAt descending (most recent first)
  for (let i = 1; i < historyResponse.data.length; i++) {
    const prevDate = new Date(historyResponse.data[i - 1].createdAt).getTime();
    const currDate = new Date(historyResponse.data[i].createdAt).getTime();
    TestValidator.predicate(
      "history entries sorted by createdAt descending",
      prevDate >= currDate,
    );
  }
}
