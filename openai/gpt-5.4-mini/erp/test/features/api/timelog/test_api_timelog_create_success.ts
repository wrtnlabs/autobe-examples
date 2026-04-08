import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timelogs_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timelog";

export async function test_api_timelog_create_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366FF",
        status: "active",
        budgetHours: 120,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const workDate = new Date().toISOString();
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const timelog = await generate_random_erp_hrm_time_member_timelogs_create(
    memberConnection,
    {
      body: {
        workDate,
        durationMinutes: 90,
        projectId: project.id,
        description,
        billable: false,
      } satisfies IErpHrmTimeTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  TestValidator.equals("timelog project id", timelog.project.id, project.id);
  TestValidator.equals(
    "timelog project organization",
    timelog.project.organization.id,
    project.organization.id,
  );
  TestValidator.equals("timelog description", timelog.description, description);
  TestValidator.equals("timelog billable flag", timelog.billable, false);
  TestValidator.equals("timelog task is null", timelog.task, null);
  TestValidator.equals("work date persists", timelog.workDate, workDate);
  TestValidator.equals(
    "timelog duration persists",
    timelog.durationMinutes,
    90,
  );
  TestValidator.equals(
    "timelog project status",
    timelog.project.status,
    "active",
  );
  TestValidator.equals(
    "timelog created by authenticated member connection",
    authorized.token.access.length > 0,
    true,
  );
}
