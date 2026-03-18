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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_me_timer_session_start_create } from "../../../generate/generate_random_hrm_time_tracking_member_me_timer_session_start_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_timer_session } from "../../../prepare/prepare_random_hrm_time_tracking_timer_session";

export async function test_api_timer_session_hide_other_employee_session(
  connection: api.IConnection,
): Promise<void> {
  const subjectAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IHrmTimeTrackingMember.IJoin,
    },
  );
  const subjectConnection: api.IConnection = { host: connection.host };
  subjectConnection.headers = { Authorization: subjectAuth.token.access };
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      subjectConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const subjectTimer =
    await generate_random_hrm_time_tracking_member_me_timer_session_start_create(
      subjectConnection,
      {
        body: {
          project_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingTimerSession.ICreate,
      },
    );
  typia.assert(subjectTimer);
  const otherAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IHrmTimeTrackingMember.IJoin,
    },
  );
  const otherConnection: api.IConnection = { host: connection.host };
  otherConnection.headers = { Authorization: otherAuth.token.access };
  const otherTimer =
    await generate_random_hrm_time_tracking_member_me_timer_session_start_create(
      otherConnection,
      {
        body: {
          project_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingTimerSession.ICreate,
      },
    );
  typia.assert(otherTimer);
  const current =
    await api.functional.hrmTimeTracking.member.me.timer_session.at(
      subjectConnection,
    );
  typia.assert(current);
  TestValidator.equals(
    "returned session belongs to the caller",
    current.employee.id,
    subjectTimer.employee.id,
  );
  TestValidator.notEquals(
    "returned session must not be the other employee session",
    current.employee.id,
    otherTimer.employee.id,
  );
  TestValidator.equals(
    "returned session keeps the caller project",
    current.project.id,
    subjectTimer.project.id,
  );
  TestValidator.equals(
    "returned session keeps the caller description",
    current.description,
    subjectTimer.description,
  );
  TestValidator.equals(
    "returned session keeps the caller task reference",
    current.task?.id ?? null,
    subjectTimer.task?.id ?? null,
  );
}
