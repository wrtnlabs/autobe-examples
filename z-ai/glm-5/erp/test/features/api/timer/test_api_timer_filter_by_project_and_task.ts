import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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

/**
 * Test filtering timer records by project and task combinations.
 * Verifies:
 * 1. Timers can be filtered by projectId
 * 2. Timers can be filtered by projectId and taskId together
 * 3. Timers can be queried with taskId=null to find unassigned timers
 * 4. Response includes proper project and task summaries with identification data
 */
export async function test_api_timer_filter_by_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Query all timers without filters (baseline)
  const allTimers = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(allTimers);
  // 3. Test: Filter by projectId only
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const timersByProject = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        projectId,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(timersByProject);
  // Validate: All returned timers should have matching projectId
  for (const timer of timersByProject.data) {
    TestValidator.equals(
      "timer project matches filter",
      timer.project.id,
      projectId,
    );
  }
  // 4. Test: Filter by projectId and taskId together
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const timersByProjectAndTask =
    await api.functional.erpHrm.member.timers.index(memberConnection, {
      body: {
        projectId,
        taskId,
      } satisfies IErpHrmTimer.IRequest,
    });
  typia.assert(timersByProjectAndTask);
  // Validate: All returned timers should have matching projectId and taskId
  for (const timer of timersByProjectAndTask.data) {
    TestValidator.equals(
      "timer project matches filter",
      timer.project.id,
      projectId,
    );
    if (timer.task !== null) {
      TestValidator.equals("timer task matches filter", timer.task.id, taskId);
    }
  }
  // 5. Test: Filter by projectId and taskId=null (timers without task assignment)
  const timersWithoutTask = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        projectId,
        taskId: null,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(timersWithoutTask);
  // Validate: All returned timers should have matching projectId and null task
  for (const timer of timersWithoutTask.data) {
    TestValidator.equals(
      "timer project matches filter",
      timer.project.id,
      projectId,
    );
    TestValidator.equals("timer has no task assignment", timer.task, null);
  }
  // 6. Test pagination with filters
  const paginatedTimers = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        projectId,
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(paginatedTimers);
  // Validate pagination bounds
  TestValidator.predicate(
    "current page is at least 1",
    paginatedTimers.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    paginatedTimers.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records is non-negative",
    paginatedTimers.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    paginatedTimers.pagination.pages >= 0,
  );
}
