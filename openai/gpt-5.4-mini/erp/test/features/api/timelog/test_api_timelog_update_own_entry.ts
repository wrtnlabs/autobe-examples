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

export async function test_api_timelog_update_own_entry(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const created = await api.functional.erpHrmTime.member.timelogs.create(
    memberConnection,
    {
      body: {
        workDate: new Date().toISOString(),
        durationMinutes: 60,
        projectId: typia.random<string & tags.Format<"uuid">>(),
        taskId: null,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IErpHrmTimeTimelog.ICreate,
    },
  );
  typia.assert(created);
  const updated = await api.functional.erpHrmTime.member.timelogs.update(
    memberConnection,
    {
      timelogId: created.id,
      body: {
        work_date: new Date(Date.now() + 60000).toISOString(),
        duration_minutes: created.duration_minutes + 15,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        billable: !created.billable,
        erp_hrm_time_project_id: typia.random<string & tags.Format<"uuid">>(),
        erp_hrm_time_task_id: null,
      } satisfies IErpHrmTimeTimelog.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("timelog id preserved", updated.id, created.id);
  TestValidator.equals(
    "work date updated",
    updated.work_date,
    new Date(Date.now() + 60000).toISOString(),
  );
  TestValidator.equals(
    "duration updated",
    updated.duration_minutes,
    created.duration_minutes + 15,
  );
  TestValidator.notEquals(
    "description changed",
    updated.description,
    created.description,
  );
  TestValidator.equals("billable toggled", updated.billable, !created.billable);
  TestValidator.equals(
    "updated time advanced",
    updated.updated_at !== created.updated_at,
    true,
  );
  const cleared = await api.functional.erpHrmTime.member.timelogs.update(
    memberConnection,
    {
      timelogId: updated.id,
      body: {
        description: null,
        erp_hrm_time_task_id: null,
      } satisfies IErpHrmTimeTimelog.IUpdate,
    },
  );
  typia.assert(cleared);
  TestValidator.equals("task remains cleared", cleared.task, null);
  TestValidator.equals("description cleared", cleared.description, null);
  await TestValidator.error("locked timelog cannot be updated", async () => {
    const locked = await api.functional.erpHrmTime.member.timelogs.create(
      memberConnection,
      {
        body: {
          workDate: new Date().toISOString(),
          durationMinutes: 30,
          projectId: typia.random<string & tags.Format<"uuid">>(),
          taskId: null,
          description: "locked entry",
          billable: true,
        } satisfies IErpHrmTimeTimelog.ICreate,
      },
    );
    typia.assert(locked);
    await api.functional.erpHrmTime.member.timelogs.update(memberConnection, {
      timelogId: locked.id,
      body: {
        description: "should fail",
      } satisfies IErpHrmTimeTimelog.IUpdate,
    });
  });
  const otherConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/join-2",
      referrer: "https://example.com/landing-2",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(otherMember);
  const otherTimelog = await api.functional.erpHrmTime.member.timelogs.create(
    otherConnection,
    {
      body: {
        workDate: new Date().toISOString(),
        durationMinutes: 25,
        projectId: typia.random<string & tags.Format<"uuid">>(),
        taskId: null,
        description: "other org entry",
        billable: true,
      } satisfies IErpHrmTimeTimelog.ICreate,
    },
  );
  typia.assert(otherTimelog);
  await TestValidator.error(
    "other organization timelog is not editable",
    async () => {
      await api.functional.erpHrmTime.member.timelogs.update(memberConnection, {
        timelogId: otherTimelog.id,
        body: {
          description: "cross-org attempt",
        } satisfies IErpHrmTimeTimelog.IUpdate,
      });
    },
  );
}
