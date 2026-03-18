import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_detail_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via join flow
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Fetch task analytics endpoint (IHrmsTask contains analytics data)
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const taskResponse = await api.functional.hrms.member.projects.tasks.at(
    memberConnection,
    {
      projectId,
      taskId,
    },
  );
  typia.assert(taskResponse);
  // 3. Validate response structure (IHrmsTask contains analytics array)
  TestValidator.equals(
    "analytics array exists",
    taskResponse.analytics !== undefined,
    true,
  );
  TestValidator.equals(
    "total projects count exists",
    taskResponse.total_projects !== undefined,
    true,
  );
  TestValidator.predicate(
    "total projects is integer",
    typeof taskResponse.total_projects === "number",
  );
  // 4. Validate analytics array structure if present
  if (taskResponse.analytics.length > 0) {
    const firstProject: IHrmsTask.ISummary = taskResponse.analytics[0];
    TestValidator.equals(
      "project_id is UUID",
      /^[0-9a-f-]{36}$/i.test(firstProject.project_id),
      true,
    );
    TestValidator.equals(
      "project_name exists",
      firstProject.project_name !== undefined,
      true,
    );
    TestValidator.equals(
      "task_count is non-negative",
      firstProject.task_count >= 0,
      true,
    );
  }
  // 5. Validate budget hours can be null or number
  if (taskResponse.total_budget_hours !== null) {
    TestValidator.predicate(
      "total_budget_hours is number",
      typeof taskResponse.total_budget_hours === "number",
    );
  }
  // 6. Validate logged hours can be null or number
  if (taskResponse.total_logged_hours !== null) {
    TestValidator.predicate(
      "total_logged_hours is number",
      typeof taskResponse.total_logged_hours === "number",
    );
  }
}