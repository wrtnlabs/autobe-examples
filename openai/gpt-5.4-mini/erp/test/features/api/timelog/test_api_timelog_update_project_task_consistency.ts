import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_timelog_update_project_task_consistency(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: typia.random<string & tags.Format<"uuid">>(),
          task_id: typia.random<string & tags.Format<"uuid">>(),
          work_date: new Date().toISOString(),
          duration_minutes: 60,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        } satisfies IHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  await TestValidator.error(
    "reject update when project and task identifiers do not form a consistent assignment",
    async () => {
      await api.functional.hrmTimeTracking.member.timelogs.update(
        memberConnection,
        {
          timelogId: timelog.id,
          body: {
            project_id: typia.random<string & tags.Format<"uuid">>(),
            task_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHrmTimeTrackingTimelog.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "reject update when only task identifier is changed to an inconsistent assignment",
    async () => {
      await api.functional.hrmTimeTracking.member.timelogs.update(
        memberConnection,
        {
          timelogId: timelog.id,
          body: {
            task_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHrmTimeTrackingTimelog.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "source timelog project remains unchanged",
    timelog.project.id,
    timelog.project.id,
  );
  TestValidator.equals(
    "source timelog task remains unchanged",
    timelog.task?.id ?? null,
    timelog.task?.id ?? null,
  );
}
