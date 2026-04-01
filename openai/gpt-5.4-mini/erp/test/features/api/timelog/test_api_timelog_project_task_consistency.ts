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
import { generate_random_erp_hrm_time_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timelogs_create";
import { prepare_random_erp_hrm_time_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timelog";

export async function test_api_timelog_project_task_consistency(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  memberConnection.headers = {
    Authorization: member.token.access,
  };
  const firstWorkDate = new Date("2026-04-01T09:00:00.000Z").toISOString();
  const secondWorkDate = new Date("2026-04-02T10:00:00.000Z").toISOString();
  const firstTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(
      memberConnection,
      {
        body: {
          workDate: firstWorkDate,
          durationMinutes: 90,
          projectId: typia.random<string & tags.Format<"uuid">>(),
          taskId: null,
          description: "Initial project work",
          billable: true,
        } satisfies IErpHrmTimeTimelog.ICreate,
      },
    );
  typia.assert(firstTimelog);
  TestValidator.equals(
    "work date preserved",
    firstTimelog.work_date,
    firstWorkDate,
  );
  TestValidator.equals("duration preserved", firstTimelog.duration_minutes, 90);
  TestValidator.equals("billable preserved", firstTimelog.billable, true);
  TestValidator.equals(
    "description preserved",
    firstTimelog.description,
    "Initial project work",
  );
  TestValidator.equals(
    "task absent when not provided",
    firstTimelog.task,
    null,
  );
  const secondTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(
      memberConnection,
      {
        body: {
          workDate: secondWorkDate,
          durationMinutes: 45,
          projectId: typia.random<string & tags.Format<"uuid">>(),
          taskId: null,
          description: "Task-aligned project work",
          billable: false,
        } satisfies IErpHrmTimeTimelog.ICreate,
      },
    );
  typia.assert(secondTimelog);
  TestValidator.equals(
    "second work date preserved",
    secondTimelog.work_date,
    secondWorkDate,
  );
  TestValidator.equals(
    "second duration preserved",
    secondTimelog.duration_minutes,
    45,
  );
  TestValidator.equals(
    "second billable preserved",
    secondTimelog.billable,
    false,
  );
  TestValidator.equals(
    "second description preserved",
    secondTimelog.description,
    "Task-aligned project work",
  );
  TestValidator.equals(
    "second task absent when not provided",
    secondTimelog.task,
    null,
  );
  await TestValidator.error("reject task from another project", async () => {
    await generate_random_erp_hrm_time_member_timelogs_create(
      memberConnection,
      {
        body: {
          workDate: new Date("2026-04-03T11:00:00.000Z").toISOString(),
          durationMinutes: 30,
          projectId: typia.random<string & tags.Format<"uuid">>(),
          taskId: typia.random<string & tags.Format<"uuid">>(),
          description: "Invalid cross-project task usage",
          billable: true,
        } satisfies IErpHrmTimeTimelog.ICreate,
      },
    );
  });
}
