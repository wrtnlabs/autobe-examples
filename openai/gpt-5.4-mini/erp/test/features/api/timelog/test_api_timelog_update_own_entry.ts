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

export async function test_api_timelog_update_own_entry(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const initialWorkDate = new Date().toISOString();
  const originalDescription = RandomGenerator.paragraph({ sentences: 2 });
  const originalTimelog =
    await api.functional.hrmTimeTracking.member.timelogs.create(
      memberConnection,
      {
        body: {
          project_id: projectId,
          work_date: initialWorkDate,
          duration_minutes: 30,
          description: originalDescription,
          billable: true,
        } satisfies IHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(originalTimelog);
  const updatedWorkDate = new Date(Date.now() + 60000).toISOString();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDuration = originalTimelog.duration_minutes + 15;
  const updatedBillable = !originalTimelog.billable;
  const updatedTimelog =
    await api.functional.hrmTimeTracking.member.timelogs.update(
      memberConnection,
      {
        timelogId: originalTimelog.id,
        body: {
          project_id: projectId,
          task_id: null,
          work_date: updatedWorkDate,
          duration_minutes: updatedDuration,
          description: updatedDescription,
          billable: updatedBillable,
        } satisfies IHrmTimeTrackingTimelog.IUpdate,
      },
    );
  typia.assert(updatedTimelog);
  TestValidator.equals(
    "timelog id should remain the same",
    updatedTimelog.id,
    originalTimelog.id,
  );
  TestValidator.equals(
    "organization should remain the same",
    updatedTimelog.organization.id,
    originalTimelog.organization.id,
  );
  TestValidator.equals(
    "employee should remain the same",
    updatedTimelog.employee.id,
    originalTimelog.employee.id,
  );
  TestValidator.equals(
    "project should remain the same",
    updatedTimelog.project.id,
    originalTimelog.project.id,
  );
  TestValidator.equals(
    "task association should be cleared",
    updatedTimelog.task,
    null,
  );
  TestValidator.equals(
    "work date should update",
    updatedTimelog.work_date,
    updatedWorkDate,
  );
  TestValidator.equals(
    "duration should update",
    updatedTimelog.duration_minutes,
    updatedDuration,
  );
  TestValidator.equals(
    "description should update",
    updatedTimelog.description,
    updatedDescription,
  );
  TestValidator.equals(
    "billable flag should update",
    updatedTimelog.billable,
    updatedBillable,
  );
  const secondUpdate =
    await api.functional.hrmTimeTracking.member.timelogs.update(
      memberConnection,
      {
        timelogId: updatedTimelog.id,
        body: {
          description: `${updatedDescription} revised`,
        } satisfies IHrmTimeTrackingTimelog.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "ownership should still be preserved",
    secondUpdate.employee.id,
    originalTimelog.employee.id,
  );
  TestValidator.equals(
    "organization should still be preserved",
    secondUpdate.organization.id,
    originalTimelog.organization.id,
  );
  TestValidator.equals("prior updates should persist", secondUpdate.task, null);
  TestValidator.equals(
    "prior updated duration should persist",
    secondUpdate.duration_minutes,
    updatedDuration,
  );
  TestValidator.equals(
    "prior updated billable should persist",
    secondUpdate.billable,
    updatedBillable,
  );
}
