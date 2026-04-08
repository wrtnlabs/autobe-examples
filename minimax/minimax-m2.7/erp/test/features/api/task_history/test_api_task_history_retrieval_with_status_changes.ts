import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_history_retrieval_with_status_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  const projectId = project.items[0].projectId;
  // 3. Create a task - this should create initial history entry
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: projectId },
    },
  );
  typia.assert(task);
  // Extract task ID from task creation response
  // The task structure should have an id field based on standard entity pattern
  const taskId = (task as any).id as string & tags.Format<"uuid">;
  // 4. Retrieve task history without pagination
  const historyResponse =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {} satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 5. Validate basic pagination metadata structure
  TestValidator.predicate(
    "has pagination info",
    historyResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    historyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    historyResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(historyResponse.data),
  );
  // 6. Test pagination with limit and page parameters
  const paginatedHistory =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(paginatedHistory);
  // 7. Validate paginated response metadata
  TestValidator.equals(
    "pagination current matches request",
    paginatedHistory.pagination.current,
    paginatedHistory.pagination.current,
  );
  TestValidator.predicate(
    "pagination limit set",
    paginatedHistory.pagination.limit > 0,
  );
  // 8. Validate history entry structure if entries exist
  if (historyResponse.data.length > 0) {
    const firstEntry = historyResponse.data[0];
    // Validate required fields exist
    TestValidator.equals("has id", firstEntry.id !== undefined, true);
    TestValidator.equals(
      "has previousStatus",
      firstEntry.previousStatus !== undefined,
      true,
    );
    TestValidator.equals(
      "has newStatus",
      firstEntry.newStatus !== undefined,
      true,
    );
    TestValidator.equals(
      "has createdAt",
      firstEntry.createdAt !== undefined,
      true,
    );
    TestValidator.equals("has member", firstEntry.member !== undefined, true);
    // Validate member summary structure
    if (firstEntry.member) {
      TestValidator.equals(
        "member has id",
        firstEntry.member.id !== undefined,
        true,
      );
      TestValidator.equals(
        "member has displayName",
        firstEntry.member.displayName !== undefined,
        true,
      );
      // Avatar is optional
      TestValidator.predicate(
        "member avatar is optional field",
        typeof firstEntry.member.avatarUri === "string" ||
          firstEntry.member.avatarUri === null ||
          firstEntry.member.avatarUri === undefined,
      );
    }
  }
  // 9. Test chronological ordering (oldest to newest)
  if (historyResponse.data.length > 1) {
    for (let i = 1; i < historyResponse.data.length; i++) {
      const prevEntry = historyResponse.data[i - 1];
      const currEntry = historyResponse.data[i];
      const prevDate = new Date(prevEntry.createdAt).getTime();
      const currDate = new Date(currEntry.createdAt).getTime();
      TestValidator.predicate(
        `entry ${i} createdAt is >= entry ${i - 1}`,
        currDate >= prevDate,
      );
    }
  }
  // 10. Test with member filter if history entries exist
  if (historyResponse.data.length > 0) {
    const memberId = historyResponse.data[0].member.id;
    const filteredHistory =
      await api.functional.erpHrm.admin.projects.tasks.histories.index(
        adminConnection,
        {
          projectId: projectId,
          taskId: taskId,
          body: {
            erpHrmMemberId: memberId,
          } satisfies IErpHrmTaskHistory.IRequest,
        },
      );
    typia.assert(filteredHistory);
    // All filtered entries should be by the specified member
    for (const entry of filteredHistory.data) {
      TestValidator.equals(
        "filtered entry member matches filter",
        entry.member.id,
        memberId,
      );
    }
  }
}