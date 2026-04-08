import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_status_change_records_history(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.erpHrmTime.auth.member.join(
    actorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        displayName: RandomGenerator.name(),
        href: "https://example.com/onboarding",
        referrer: "https://example.com/referrer",
        avatarImageUrl: null,
        phoneNumber: null,
        ip: null,
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(authorized);
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const status = RandomGenerator.pick([
    "open",
    "in-progress",
    "completed",
    "closed",
  ] as const);
  const updated = await api.functional.erpHrmTime.member.projects.tasks.update(
    actorConnection,
    {
      projectId,
      taskId,
      body: {
        status,
      } satisfies IErpHrmTimeTaskHistoryEntry.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("task id should remain the same", updated.id, taskId);
  TestValidator.equals(
    "task status should change to the requested value",
    updated.status,
    status,
  );
  TestValidator.equals(
    "task project should remain scoped to the requested project",
    updated.project.id,
    projectId,
  );
  TestValidator.predicate(
    "task should include a project context",
    updated.project !== null,
  );
  TestValidator.predicate(
    "task should expose the current assignment context",
    updated.employee === null || updated.employee.id !== undefined,
  );
}
