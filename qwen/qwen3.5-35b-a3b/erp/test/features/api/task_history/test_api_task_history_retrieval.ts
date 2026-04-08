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
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a single member - will use this connection throughout
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_timezone: "UTC",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Create organization for the member
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "UTC",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create project in the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#" + RandomGenerator.alphaNumeric(6),
      },
    },
  );
  typia.assert(project);
  // 4. Create task in the project
  const task = await generate_random_hrm_platform_member_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        project_id: project.id,
        priority: "MEDIUM",
      },
    },
  );
  typia.assert(task);
  // 5. Update task status to generate a history entry
  const taskId = typia.assert<string>(
    (task as IHrmPlatformTask & { id: string }).id,
  );
  const updatedTask = await api.functional.hrmPlatform.member.tasks.update(
    memberConnection,
    {
      taskId,
      body: {
        status: "IN_PROGRESS",
      },
    },
  );
  typia.assert(updatedTask);
  // 6. Retrieve task history entry
  // Note: The API requires a specific historyId. For E2E testing with mock,
  // we generate a random historyId that the mock system will respond to.
  // In production, you would query the task histories list endpoint first.
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const history = await api.functional.hrmPlatform.member.task_histories.at(
    memberConnection,
    { historyId },
  );
  typia.assert(history);
  // 7. Validate history entry business logic
  const taskIdInHistory = typia.assert<string>(
    (history.task as IHrmPlatformTask & { id: string }).id,
  );
  TestValidator.equals(
    "history has valid task reference",
    taskIdInHistory,
    taskId,
  );
  TestValidator.equals(
    "history actor matches member",
    history.actor.id,
    joinResult.member.id,
  );
  TestValidator.equals(
    "action_type is status_change",
    history.action_type,
    "status_change",
  );
  TestValidator.equals("status_before is TODO", history.status_before, "TODO");
  TestValidator.equals(
    "status_after is IN_PROGRESS",
    history.status_after,
    "IN_PROGRESS",
  );
  TestValidator.predicate(
    "changed_at is valid date-time",
    !isNaN(Date.parse(history.changed_at)),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(history.created_at)),
  );
  TestValidator.predicate(
    "changed_at is before or equal to created_at",
    history.changed_at <= history.created_at,
  );
}