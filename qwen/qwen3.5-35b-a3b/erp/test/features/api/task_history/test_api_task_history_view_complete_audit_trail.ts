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

export async function test_api_task_history_view_complete_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
        >(),
      },
    },
  );
  typia.assert(project);
  // 3. Create initial task
  const task = await api.functional.hrmPlatform.member.tasks.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        project_id: project.id,
        priority: RandomGenerator.pick(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        due_date: typia.random<string & tags.Format<"date-time">>(),
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // Extract task ID using type assertion (IHrmPlatformTask doesn't expose id in type)
  const taskId: string = (task as any).id;
  // 4. Retrieve task history
  const historyResponse =
    await api.functional.hrmPlatform.member.tasks.histories.index(
      memberConnection,
      {
        taskId: taskId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 5. Validate history pagination
  TestValidator.equals(
    "history pagination current page",
    historyResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "history pagination limit",
    historyResponse.pagination.limit >= 1 &&
      historyResponse.pagination.limit <= 100,
  );
  TestValidator.equals(
    "history pagination records matches data length",
    historyResponse.pagination.records,
    historyResponse.data.length,
  );
  TestValidator.predicate(
    "history total count is non-negative",
    historyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "history pages is non-negative",
    historyResponse.pagination.pages >= 0,
  );
  // 6. Validate each history entry structure
  if (historyResponse.data.length > 0) {
    for (let i = 0; i < historyResponse.data.length; i++) {
      const entry = historyResponse.data[i];
      typia.assert(entry);
      TestValidator.equals(
        `entry ${i} has valid uuid id`,
        entry.id !== undefined,
        true,
      );
      TestValidator.equals(
        `entry ${i} task reference exists`,
        entry.task.id !== undefined,
        true,
      );
      TestValidator.equals(
        `entry ${i} actor reference exists`,
        entry.actor.id !== undefined,
        true,
      );
      TestValidator.predicate(
        `entry ${i} has valid action_type`,
        entry.action_type !== undefined && entry.action_type.length > 0,
      );
      TestValidator.equals(
        `entry ${i} task id matches parent`,
        entry.task.id,
        taskId,
      );
      TestValidator.equals(
        `entry ${i} actor id matches member`,
        entry.actor.id,
        memberAuth.member.id,
      );
      TestValidator.predicate(
        `entry ${i} has valid changed_at timestamp`,
        entry.changed_at !== undefined,
      );
      TestValidator.predicate(
        `entry ${i} has valid created_at timestamp`,
        entry.created_at !== undefined,
      );
    }
    // Validate pagination metadata completeness
    TestValidator.predicate(
      "pagination has all required fields",
      historyResponse.pagination.current !== undefined &&
        historyResponse.pagination.limit !== undefined &&
        historyResponse.pagination.records !== undefined &&
        historyResponse.pagination.pages !== undefined,
    );
  }
}
