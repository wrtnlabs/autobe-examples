import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timers_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timers_create";
import { prepare_random_hrm_time_tracking_timer } from "../../../prepare/prepare_random_hrm_time_tracking_timer";

export async function test_api_timer_single_active_conflict(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const firstTimer =
    await generate_random_hrm_time_tracking_employee_timers_create(
      employeeConnection,
      {},
    );
  typia.assert(firstTimer);
  const firstTimerId = firstTimer.id;
  TestValidator.equals(
    "timer belongs to authorized employee",
    firstTimer.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timer email matches authorized employee",
    firstTimer.employee.email,
    authorized.email,
  );
  TestValidator.equals(
    "timer organization matches authorized role organization",
    firstTimer.organization.id,
    authorized.role.organization.id,
  );
  await TestValidator.error(
    "reject second active timer for same employee",
    async () => {
      await generate_random_hrm_time_tracking_employee_timers_create(
        employeeConnection,
        {},
      );
    },
  );
  TestValidator.equals(
    "first timer id remains unchanged",
    firstTimer.id,
    firstTimerId,
  );
  TestValidator.equals(
    "first timer employee remains unchanged",
    firstTimer.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "first timer organization remains unchanged",
    firstTimer.organization.id,
    authorized.role.organization.id,
  );
}
