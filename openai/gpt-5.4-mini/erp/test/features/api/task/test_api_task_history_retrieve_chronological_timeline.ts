import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTask";
import type { IPageIHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_history_retrieve_chronological_timeline(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const candidateProjectIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  let selectedProjectId: string | null = null;
  let selectedTask: IHrmTimeTrackingTask.ISummary | null = null;
  for (const projectId of candidateProjectIds) {
    const taskList =
      await api.functional.hrmTimeTracking.member.projects.tasks.index(
        memberConnection,
        {
          projectId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IHrmTimeTrackingTask.IRequest,
        },
      );
    typia.assert(taskList);
    const task = taskList.data[0] ?? null;
    if (task !== null) {
      selectedProjectId = projectId;
      selectedTask = task;
      break;
    }
  }
  TestValidator.predicate(
    "should find at least one accessible project task to inspect history",
    selectedProjectId !== null && selectedTask !== null,
  );
  if (selectedProjectId === null || selectedTask === null) return;
  const historyFirst =
    await api.functional.hrmTimeTracking.member.projects.tasks.task_histories.index(
      memberConnection,
      {
        projectId: selectedProjectId,
        taskId: selectedTask.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies IHrmTimeTrackingTaskHistory.IRequest,
      },
    );
  typia.assert(historyFirst);
  const historySecond =
    await api.functional.hrmTimeTracking.member.projects.tasks.task_histories.index(
      memberConnection,
      {
        projectId: selectedProjectId,
        taskId: selectedTask.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies IHrmTimeTrackingTaskHistory.IRequest,
      },
    );
  typia.assert(historySecond);
  TestValidator.equals(
    "history pagination should be stable across repeated reads",
    historyFirst.pagination,
    historySecond.pagination,
  );
  TestValidator.equals(
    "history data should be stable across repeated reads",
    historyFirst.data,
    historySecond.data,
  );
  TestValidator.predicate(
    "history page should be in chronological order",
    historyFirst.data.every(
      (entry, index, array) =>
        index === 0 || array[index - 1].changed_at <= entry.changed_at,
    ),
  );
  TestValidator.predicate(
    "each history item should belong to the selected task",
    historyFirst.data.every((entry) => entry.task.id === selectedTask.id),
  );
  TestValidator.predicate(
    "history pagination metadata should be present",
    historyFirst.pagination.current >= 1 &&
      historyFirst.pagination.limit >= 0 &&
      historyFirst.pagination.records >= 0 &&
      historyFirst.pagination.pages >= 0,
  );
}
