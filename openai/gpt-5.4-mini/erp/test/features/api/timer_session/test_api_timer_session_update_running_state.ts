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
import type { IHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimerSession";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import type { IPageIHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_me_timer_session_start_create } from "../../../generate/generate_random_hrm_time_tracking_member_me_timer_session_start_create";
import { prepare_random_hrm_time_tracking_timer_session } from "../../../prepare/prepare_random_hrm_time_tracking_timer_session";

export async function test_api_timer_session_update_running_state(
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
  const organizations =
    await api.functional.hrmTimeTracking.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingOrganization.IRequest,
      },
    );
  typia.assert(organizations);
  TestValidator.predicate(
    "member should have at least one accessible organization",
    organizations.data.length > 0,
  );
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const started =
    await api.functional.hrmTimeTracking.member.me.timer_session.start.create(
      memberConnection,
      {
        body: {
          project_id: projectId,
          task_id: taskId,
          description: initialDescription,
        } satisfies IHrmTimeTrackingTimerSession.ICreate,
      },
    );
  typia.assert(started);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updated =
    await api.functional.hrmTimeTracking.member.me.timer_session.index(
      memberConnection,
      {
        body: {
          action: "update",
          description: updatedDescription,
          project_id: projectId,
          task_id: taskId,
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(updated);
  TestValidator.predicate(
    "timer session page should contain at least one active record",
    updated.data.length > 0,
  );
  const session = updated.data[0];
  TestValidator.equals(
    "timer session id should remain the same",
    session.id,
    started.id,
  );
  TestValidator.equals(
    "timer session started_at should remain unchanged",
    session.started_at,
    started.started_at,
  );
  TestValidator.equals(
    "timer session description should be updated",
    session.description,
    updatedDescription,
  );
  TestValidator.equals(
    "timer session project should remain the same",
    session.project.id,
    started.project.id,
  );
  TestValidator.equals(
    "timer session task should remain the same",
    session.task?.id,
    started.task?.id,
  );
  TestValidator.equals(
    "timer session owner should remain the same employee",
    session.employee.id,
    started.employee.id,
  );
  TestValidator.equals("timer should still be active", session.ended_at, null);
  TestValidator.equals(
    "timer should not be discarded",
    session.discarded_at,
    null,
  );
}
