import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_history_filter_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and get access token
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAuthorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(memberAuthorized);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuthorized.token.access };
  // 2. Create project
  const project: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.create(memberConnection, {
      body: {
        name: RandomGenerator.name(2),
        color_code: RandomGenerator.alphaNumeric(6).toUpperCase(),
        description: RandomGenerator.paragraph(),
      } satisfies IHrmPlatformProject.ICreate,
    });
  typia.assert(project);
  // 3. Create task
  const task: IHrmPlatformTask.ISummary =
    typia.assert<IHrmPlatformTask.ISummary>(
      await api.functional.hrmPlatform.member.tasks.create(memberConnection, {
        body: {
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          project_id: project.id,
          priority: "MEDIUM",
        } satisfies IHrmPlatformTask.ICreate,
      }),
    );
  // 4. Query all task history to establish baseline
  const allHistory: IPageIHrmPlatformTaskHistory.ISummary =
    await api.functional.hrmPlatform.member.tasks.histories.index(
      memberConnection,
      {
        taskId: task.id,
        body: {},
      },
    );
  typia.assert(allHistory);
  // 5. Query history with action_type filter
  const statusChanges: IPageIHrmPlatformTaskHistory.ISummary =
    await api.functional.hrmPlatform.member.tasks.histories.index(
      memberConnection,
      {
        taskId: task.id,
        body: {
          action_type: "status_change",
        },
      },
    );
  typia.assert(statusChanges);
  // 6. Query history with status_before filter
  const statusBeforeFilter: IPageIHrmPlatformTaskHistory.ISummary =
    await api.functional.hrmPlatform.member.tasks.histories.index(
      memberConnection,
      {
        taskId: task.id,
        body: {
          status_before: "TODO",
          action_type: "status_change",
        },
      },
    );
  typia.assert(statusBeforeFilter);
  // 7. Query history with status_after filter
  const statusAfterFilter: IPageIHrmPlatformTaskHistory.ISummary =
    await api.functional.hrmPlatform.member.tasks.histories.index(
      memberConnection,
      {
        taskId: task.id,
        body: {
          status_after: "DONE",
          action_type: "status_change",
        },
      },
    );
  typia.assert(statusAfterFilter);
  // 8. Validate filter results return consistent record counts
  TestValidator.equals(
    "status_before filter records count matches data length",
    statusBeforeFilter.pagination.records,
    statusBeforeFilter.data.length,
  );
  TestValidator.equals(
    "status_after filter records count matches data length",
    statusAfterFilter.pagination.records,
    statusAfterFilter.data.length,
  );
  TestValidator.equals(
    "action_type filter records count matches data length",
    statusChanges.pagination.records,
    statusChanges.data.length,
  );
  // 9. Validate filter criteria in returned data
  for (const entry of statusBeforeFilter.data) {
    typia.assert(entry);
    TestValidator.equals(
      "entry status_before matches filter",
      entry.status_before,
      "TODO",
    );
    TestValidator.equals(
      "entry action_type is status_change",
      entry.action_type,
      "status_change",
    );
  }
  for (const entry of statusAfterFilter.data) {
    typia.assert(entry);
    TestValidator.equals(
      "entry status_after matches filter",
      entry.status_after,
      "DONE",
    );
    TestValidator.equals(
      "entry action_type is status_change",
      entry.action_type,
      "status_change",
    );
  }
  for (const entry of statusChanges.data) {
    typia.assert(entry);
    TestValidator.equals(
      "entry action_type is status_change",
      entry.action_type,
      "status_change",
    );
  }
  // 10. Validate ordering by changed_at DESC
  if (statusChanges.data.length > 1) {
    for (let i = 1; i < statusChanges.data.length; i++) {
      const prevChangedAt = new Date(
        statusChanges.data[i - 1].changed_at,
      ).getTime();
      const currChangedAt = new Date(
        statusChanges.data[i].changed_at,
      ).getTime();
      TestValidator.predicate(
        "entries ordered by changed_at DESC",
        prevChangedAt >= currChangedAt,
      );
    }
  }
  // 11. Validate pagination metadata with filtered results
  TestValidator.equals(
    "pagination current page is 1",
    statusBeforeFilter.pagination.current,
    1,
  );
  // Validate that pagination limit is reasonable relative to data length
  TestValidator.predicate(
    "pagination limit is at least data length",
    statusBeforeFilter.pagination.limit >= statusBeforeFilter.data.length,
  );
  // 12. Validate that filtered results don't include non-status-change entries
  for (const entry of statusBeforeFilter.data) {
    typia.assert(entry);
    TestValidator.equals(
      "status_before filter excludes non-status-change entries",
      entry.action_type,
      "status_change",
    );
  }
  for (const entry of statusAfterFilter.data) {
    typia.assert(entry);
    TestValidator.equals(
      "status_after filter excludes non-status-change entries",
      entry.action_type,
      "status_change",
    );
  }
  // 13. Validate total_count reflects filtered results, not total history entries
  TestValidator.predicate(
    "status_before filter count does not exceed total history",
    statusBeforeFilter.pagination.records <= allHistory.pagination.records,
  );
  TestValidator.predicate(
    "status_after filter count does not exceed total history",
    statusAfterFilter.pagination.records <= allHistory.pagination.records,
  );
}
