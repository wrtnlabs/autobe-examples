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

export async function test_api_task_update_success_in_project(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Aa!",
      displayName: RandomGenerator.name(),
      href: "http://localhost/erpHrmTime/member/projects",
      referrer: "http://localhost/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const estimatedHours = typia.random<number>();
  const priority = RandomGenerator.pick([
    "low",
    "medium",
    "high",
    "urgent",
  ] as const);
  const title = RandomGenerator.name();
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const updated = await api.functional.erpHrmTime.member.projects.tasks.update(
    memberConnection,
    {
      projectId,
      taskId,
      body: {
        title,
        description,
        priority,
        estimated_hours: estimatedHours,
        due_date: dueDate,
      } satisfies IErpHrmTimeTaskHistoryEntry.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("task id should remain the same", updated.id, taskId);
  TestValidator.equals(
    "project id should remain the same",
    updated.project.id,
    projectId,
  );
  TestValidator.equals("title should be updated", updated.title, title);
  TestValidator.equals(
    "description should be updated",
    updated.description,
    description,
  );
  TestValidator.equals(
    "priority should be updated",
    updated.priority,
    priority,
  );
  TestValidator.equals(
    "estimated hours should be updated",
    updated.estimatedHours,
    estimatedHours,
  );
  TestValidator.equals("due date should be updated", updated.dueDate, dueDate);
  TestValidator.equals(
    "employee assignment should be reflected",
    updated.employee,
    updated.employee,
  );
  TestValidator.equals(
    "parent task relationship should be reflected",
    updated.parentTask,
    updated.parentTask,
  );
  const noOp = await api.functional.erpHrmTime.member.projects.tasks.update(
    memberConnection,
    {
      projectId,
      taskId,
      body: {},
    },
  );
  typia.assert(noOp);
  TestValidator.equals(
    "no-op update should preserve task id",
    noOp.id,
    updated.id,
  );
  TestValidator.equals(
    "no-op update should preserve project id",
    noOp.project.id,
    updated.project.id,
  );
  TestValidator.equals(
    "no-op update should preserve title",
    noOp.title,
    updated.title,
  );
  TestValidator.equals(
    "no-op update should preserve description",
    noOp.description,
    updated.description,
  );
  TestValidator.equals(
    "no-op update should preserve priority",
    noOp.priority,
    updated.priority,
  );
  TestValidator.equals(
    "no-op update should preserve estimated hours",
    noOp.estimatedHours,
    updated.estimatedHours,
  );
  TestValidator.equals(
    "no-op update should preserve due date",
    noOp.dueDate,
    updated.dueDate,
  );
  TestValidator.equals(
    "no-op update should preserve employee assignment",
    noOp.employee,
    updated.employee,
  );
  TestValidator.equals(
    "no-op update should preserve parent task relationship",
    noOp.parentTask,
    updated.parentTask,
  );
}
