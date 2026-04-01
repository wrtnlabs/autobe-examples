import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_retrieve_by_project_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const task = await api.functional.erpHrmTime.member.projects.tasks.at(
    memberConnection,
    {
      projectId,
      taskId,
    },
  );
  typia.assert(task);
  TestValidator.equals("task id matches request", task.id, taskId);
  TestValidator.equals(
    "project id scope matches request",
    task.project.id,
    projectId,
  );
  TestValidator.equals(
    "project organization is present",
    task.project.organization !== null,
    true,
  );
  TestValidator.equals(
    "description nullable shape",
    task.description,
    task.description,
  );
  TestValidator.equals(
    "estimated hours nullable shape",
    task.estimatedHours,
    task.estimatedHours,
  );
  TestValidator.equals("due date nullable shape", task.dueDate, task.dueDate);
  TestValidator.equals("employee nullable shape", task.employee, task.employee);
  TestValidator.equals(
    "parent task nullable shape",
    task.parentTask,
    task.parentTask,
  );
}
