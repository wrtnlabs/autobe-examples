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

export async function test_api_timelog_update_project_task_consistency(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const sourceProject =
    await generate_random_erp_hrm_time_member_projects_create(
      memberConnection,
      {
        body: {
          name: `source-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#3366FF",
          status: "active",
          budgetHours: null,
          startDate: null,
          endDate: null,
        } satisfies IErpHrmTimeProject.ICreate,
      },
    );
  typia.assert(sourceProject);
  const sourceTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(
      memberConnection,
      {
        body: {
          workDate: new Date().toISOString(),
          durationMinutes: 90,
          projectId: sourceProject.id,
          taskId: null,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        } satisfies IErpHrmTimeTimelog.ICreate,
      },
    );
  typia.assert(sourceTimelog);
  const updatedTimelog = await api.functional.erpHrmTime.member.timelogs.update(
    memberConnection,
    {
      timelogId: sourceTimelog.id,
      body: {
        duration_minutes: 120,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: false,
      } satisfies IErpHrmTimeTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimelog);
  TestValidator.equals(
    "timelog id should remain stable",
    updatedTimelog.id,
    sourceTimelog.id,
  );
  TestValidator.equals(
    "timelog member should remain stable",
    updatedTimelog.member,
    sourceTimelog.member,
  );
  TestValidator.equals(
    "timelog project should remain stable when not changed",
    updatedTimelog.project,
    sourceTimelog.project,
  );
  TestValidator.equals(
    "timelog task should remain stable when not changed",
    updatedTimelog.task,
    sourceTimelog.task,
  );
  TestValidator.equals(
    "updated duration should persist",
    updatedTimelog.duration_minutes,
    120,
  );
  TestValidator.equals(
    "updated billable flag should persist",
    updatedTimelog.billable,
    false,
  );
}
